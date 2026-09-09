"""GET /health answers with JSON that names this service.

Installed fleet-wide by core/standards/install_health.py. See STACK_STANDARD.md.

Why this is middleware rather than a route
------------------------------------------
`deployment_target.py` has to make a running application identify itself at its own origin,
because a name is never evidence: every runtime proof written for StakeHouse across nine
prompts was read against the `stakehouse` database while the deployed process was using
`StakehouseHQ_Company`, and nothing lied -- the name simply resembled the thing. 32 of the
fleet's deployment targets sit at PARTIALLY_VERIFIED for want of an `app_identity`, and that
state blocks every execution-based pass.

The obvious fix -- register `@app.get("/health")` returning the name -- is wrong in most of
the 50 programs that need it, because they already have a /health doing real work: probing
Mongo, timing the query, reporting RAG and payment subsystems. FastAPI matches the FIRST
route registered, so an appended route either loses to the existing one or, if it wins,
throws that work away. The convention is that the response NAMES the service. It was never
that every program answers the same shallow question.

So this sits in front, touches nothing but `GET /health`, and:

  * passes the request down untouched, then adds `service` to the JSON that comes back
    if -- and only if -- nothing there already names it;
  * respects the fleet's API envelope, putting the name inside `data` for programs that
    return {data, error, message}, because that is where the rest of their payload lives;
  * answers with a minimal document itself when there is no /health behind it at all;
  * leaves non-JSON, error and streaming responses exactly as they were.

Every request that is not `GET /health` takes one dict lookup and a return, so the cost to
the serving path is not measurable.
"""
from __future__ import annotations

import json

#: Keys that count as naming the service, in the order deployment_target reads them.
NAME_KEYS = ("service", "app", "name", "application")


def _names_service(doc: dict) -> bool:
    if any(isinstance(doc.get(k), str) and doc[k].strip() for k in NAME_KEYS):
        return True
    data = doc.get("data")
    if isinstance(data, dict) and {"error", "message"} & set(doc):
        return any(isinstance(data.get(k), str) and data[k].strip() for k in NAME_KEYS)
    return False


def _with_service(doc: dict, service: str) -> dict:
    """Put the name where the rest of this program's payload already lives."""
    data = doc.get("data")
    if isinstance(data, dict) and {"error", "message"} & set(doc):
        data.setdefault("service", service)
    else:
        doc.setdefault("service", service)
    return doc


class FleetHealth:
    """Pure ASGI middleware -- no BaseHTTPMiddleware, so no per-request task overhead."""

    def __init__(self, app, service: str):
        self.app = app
        self.service = service

    async def __call__(self, scope, receive, send):
        if (scope.get("type") != "http" or scope.get("method") != "GET"
                or scope.get("path") != "/health"):
            return await self.app(scope, receive, send)

        status: int | None = None
        headers: list = []
        body = bytearray()
        finished = False

        async def capture(message):
            nonlocal status, headers, finished
            kind = message["type"]
            if kind == "http.response.start":
                status, headers = message["status"], list(message.get("headers") or [])
                return                      # withheld: the body decides what we send
            if kind == "http.response.body":
                body.extend(message.get("body") or b"")
                if message.get("more_body"):
                    return
                finished = True
                await self._respond(status, headers, bytes(body), send)
                return
            await send(message)

        await self.app(scope, receive, capture)

        # A downstream app that ends the response without a final body frame (or one that
        # streams) leaves nothing sent, and a request that hangs is worse than an unnamed
        # health check. Flush whatever was captured, unmodified.
        if not finished and status is not None:
            await self._raw(status, headers, bytes(body), send)

    async def _respond(self, status, headers, raw, send):
        # 404: nothing is mounted at /health, so answer for it.
        # 401/403: every route is behind auth, so monitoring cannot read health at all --
        # which is the failure this convention exists to prevent. Answering discloses the
        # program's name and nothing else, and ContentOS already returns that unauthenticated
        # in its own `WWW-Authenticate: Basic realm="Content OS"` header, so the minimal
        # document reveals nothing a caller could not already read. No downstream payload is
        # ever forwarded from an unauthorised response.
        if status in (404, 401, 403):
            return await self._json(200, {"service": self.service, "status": "ok"}, send)
        if status is None or not (200 <= status < 300):
            return await self._raw(status or 500, headers, raw, send)
        ctype = next((v.decode("latin-1") for k, v in headers
                      if k.decode("latin-1").lower() == "content-type"), "")
        if "json" not in ctype.lower():
            return await self._raw(status, headers, raw, send)
        try:
            doc = json.loads(raw or b"{}")
        except Exception:
            return await self._raw(status, headers, raw, send)
        if not isinstance(doc, dict) or _names_service(doc):
            return await self._raw(status, headers, raw, send)
        return await self._json(status, _with_service(doc, self.service), send,
                                headers=headers)

    async def _json(self, status, doc, send, headers=None):
        raw = json.dumps(doc).encode()
        keep = [(k, v) for k, v in (headers or [])
                if k.decode("latin-1").lower() not in ("content-length", "content-type")]
        keep += [(b"content-type", b"application/json"),
                 (b"content-length", str(len(raw)).encode())]
        await send({"type": "http.response.start", "status": status, "headers": keep})
        await send({"type": "http.response.body", "body": raw})

    async def _raw(self, status, headers, raw, send):
        await send({"type": "http.response.start", "status": status, "headers": headers})
        await send({"type": "http.response.body", "body": raw})

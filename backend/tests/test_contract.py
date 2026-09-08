"""The invariants that have actually broken in this fleet.

Not a stub suite. Every test here corresponds to a defect that shipped somewhere in these
sixty programs: an application whose routes 500 on a name nobody bound, a route that
answers 200 to a caller carrying no token, and a suite that quietly ran against live data.
"""
import os
import re
import subprocess
import sys

import pytest
from fastapi.routing import APIRoute
from starlette.routing import Mount

from main import app


def _api_routes(application=app, prefix=""):
    """Every route the application serves, including those behind a Mount.

    A mounted sub-application is still this application's surface. colorclub builds an
    outer app and mounts a second FastAPI holding every router it has, so reading only
    the outer object reports an application with no routes at all -- and a protected-route
    check that finds nothing passes by checking nothing.
    """
    out = []
    for route in getattr(application, "routes", []):
        if isinstance(route, APIRoute):
            out.append((prefix + route.path, route))
        elif isinstance(route, Mount) and getattr(route, "app", None) is not None:
            if route.app is not application:
                out.extend(_api_routes(route.app, prefix + route.path.rstrip("/")))
    return out


# ── the suite's own footing ──────────────────────────────────────────────────────
def _databases_the_application_opened():
    """Every Mongo database object reachable from the modules the app imported.

    Asked of the running application rather than of its config, because those are
    different questions and the gap between them is where the damage happens: a suite
    once redirected the connection URI while the application resolved its database from
    DATABASE_NAME, and a fixture's cleanup emptied production.
    """
    found = {}
    for name, mod in list(sys.modules.items()):
        if not mod or not getattr(mod, "__file__", None):
            continue
        if "site-packages" in (mod.__file__ or "") or "/venv/" in (mod.__file__ or ""):
            continue
        for attr in dir(mod):
            try:
                obj = getattr(mod, attr)
            except Exception:                                        # noqa: BLE001
                continue
            cls = type(obj)
            if cls.__module__.split(".")[0] in ("pymongo", "motor") and \
                    cls.__name__ in ("Database", "AsyncIOMotorDatabase"):
                try:
                    found[f"{name}.{attr}"] = obj.name
                except Exception:                                    # noqa: BLE001
                    pass
    return found


def test_the_suite_is_not_pointed_at_the_live_database(client):
    """The first thing to establish, because every test below runs through the app.

    A suite that believes it is isolated and is not does more damage than no suite: it
    runs with confidence.
    """
    assert os.environ["DATABASE_NAME"].endswith("_test"), os.environ["DATABASE_NAME"]
    opened = _databases_the_application_opened()
    live = {k: v for k, v in opened.items() if not v.endswith("_test")}
    assert not live, f"the application opened a database that is not a test database: {live}"


# ── the application boots ────────────────────────────────────────────────────────
def test_the_application_imports_and_registers_its_routes():
    assert _api_routes(), "the application registered no routes; a router failed to load"


def _applications(application=app):
    """The application and every FastAPI mounted inside it."""
    out = [application]
    for route in getattr(application, "routes", []):
        sub = getattr(route, "app", None)
        if isinstance(route, Mount) and hasattr(sub, "openapi") and sub is not application:
            out.extend(_applications(sub))
    return out


def test_the_openapi_schema_builds():
    """A schema that cannot be built is a signature FastAPI could not read -- which is how
    a gated POST came to demand its request body as a query parameter.

    Built rather than fetched: whether the schema is SERVED is a deployment choice (several
    programs set openapi_url=None on purpose), while whether it can be BUILT is the
    invariant. Every mounted application is built too -- where a program mounts its API
    under an outer shell, the shell's own schema is legitimately empty and asking only that
    one proves nothing.
    """
    paths = {}
    for a in _applications():
        paths.update(a.openapi().get("paths") or {})
    assert paths, "no application described any path"


HEALTH = [path for path, r in _api_routes()
          if "GET" in r.methods
          and re.fullmatch(r"/(api/)?(health|healthz|ping)/?", path)]


@pytest.mark.skipif(not HEALTH, reason="this program declares no health route")
def test_health_answers(client):
    for path in HEALTH:
        r = client.get(path)
        assert r.status_code == 200, f"{path} answered {r.status_code}: {r.text[:200]}"


# ── a name that is never bound is a 500 the tests cannot see ─────────────────────
def test_no_undefined_names(backend_root):
    """Five ERP endpoints answered 500 in production for most of a day while 1,576 tests
    passed, because nothing covered those five. A NameError does not fail at import; it
    fails the moment the line runs, and FastAPI serves that as a 500.
    """
    out = subprocess.run([sys.executable, "-m", "pyflakes", "."],
                         cwd=backend_root, capture_output=True, text=True).stdout
    undefined = [ln for ln in out.splitlines()
                 if "undefined name" in ln
                 and "/venv/" not in ln and "site-packages" not in ln
                 and "/node_modules/" not in ln]
    assert not undefined, "\n".join(undefined)


# ── every protected route actually refuses an anonymous caller ───────────────────
#: Auth dependencies are NAMED differently in every program -- get_current_user,
#: require_admin, verify_token, current_account. The shape is what they share, so the
#: routes are derived from the app itself: a hand-written list of protected endpoints
#: stops being true the first time somebody adds a router.
_AUTH = re.compile(r"^(get_)?(current|require|verify)_", re.I)


def _protected_routes():
    out = []
    for path, route in _api_routes():
        if "{" in path:
            continue
        names, stack = set(), list(route.dependant.dependencies)
        while stack:                        # dependencies of dependencies count too
            d = stack.pop()
            names.add(getattr(d.call, "__name__", ""))
            stack.extend(d.dependencies)
        if any(_AUTH.match(n or "") for n in names):
            for method in sorted(route.methods - {"HEAD", "OPTIONS"}):
                out.append((method, path))
    return sorted(set(out))


PROTECTED = _protected_routes()


@pytest.mark.skipif(not PROTECTED, reason="this program declares no authenticated routes")
@pytest.mark.parametrize("method,path", PROTECTED)
def test_a_protected_route_refuses_an_anonymous_caller(client, method, path):
    r = client.request(method, path)
    assert r.status_code in (401, 403), (
        f"{method} {path} answered {r.status_code} to a caller with no token")

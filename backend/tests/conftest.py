"""Point the application at a test database BEFORE it is imported.

THE ORDER IS THE WHOLE THING. Settings are read once, at import, and often cached -- so a
redirect written after `from main import app` changes nothing at all: the application has
already resolved and opened the live database by then.

DATABASE_NAME is the fleet-standard key (CON-001), which is why this one assignment is
enough. It is an assignment and not a setdefault: a DATABASE_NAME exported for the running
service would otherwise be inherited, and the suite would write to production.
"""

# --- fleet test-database gate ------------------------------------------------------
# This program resolves its database from the connection string's PATH
# (get_default_database()), so DATABASE_NAME is never read. Setting the URI is the only
# thing that moves it -- the same line Fixology's conftest already uses.
import os as _os

TEST_DATABASE = "Tester_Company_test"
_os.environ["MONGO_URI"] = "mongodb://localhost:27017/" + TEST_DATABASE


def pytest_configure(config):
    """Refuse to run at all rather than write into live data."""
    import importlib

    for _mod in ("config.settings", "config.database", "app.config", "main", "settings"):
        try:
            _m = importlib.import_module(_mod)
        except Exception:
            continue
        for _holder in (getattr(_m, "settings", None), _m):
            if _holder is None:
                continue
            for _attr in ("MONGO_URI", "mongo_uri", "MONGODB_URI"):
                _uri = getattr(_holder, _attr, None)
                if isinstance(_uri, str) and "://" in _uri:
                    _name = _uri.split("://", 1)[1].split("?")[0]
                    _name = _name.split("/", 1)[1].strip("/") if "/" in _name else ""
                    assert _name == TEST_DATABASE, (
                        f"tests resolved database {_name!r}, not {TEST_DATABASE!r} -- "
                        "refusing to run against a non-test database")
                    return
    raise AssertionError(
        "could not determine which database this suite will use; refusing to run")
# -----------------------------------------------------------------------------------
import os
import sys
from pathlib import Path

os.environ["DATABASE_NAME"] = os.getenv("TEST_DATABASE_NAME", "Tester_Company_test")

BACKEND = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND))

import pytest                                                        # noqa: E402
from fastapi.testclient import TestClient                            # noqa: E402

from main import app                                                # noqa: E402


@pytest.fixture(scope="session")
def client():
    # The context manager runs the lifespan/startup, which is what opens the database.
    # Without it every route that touches the db fails on a None client and the suite
    # would be testing the error path.
    with TestClient(app) as c:
        yield c


@pytest.fixture(scope="session")
def backend_root() -> Path:
    return BACKEND


# ── run-scoped identities, and a teardown that proves itself ─────────────────
#
# E2E_STANDARD.md: addresses are namespaced qa-tester-<role>-<runId>-<n>@<domain>, so
# <runId> groups everything ONE run created and cleanup is exact. A timestamp bound on its
# own is approximate -- it depends on clock behaviour, and two concurrent runs delete each
# other's rows. The creation-time bound is kept as a SECOND constraint, so even a shared
# runId cannot reach an earlier run's records.
#
# <role> is how a program tests a hand-off: two identities in one run share the runId and
# stay individually attributable. <n> allows several of the same role, and the tester
# segment stops any other program's sweep reaching these rows.
import datetime as _qa_dt
import itertools as _qa_itertools
import os as _qa_os
import re as _qa_re
import uuid as _qa_uuid

from bson import ObjectId as _QaObjectId
import pymongo as _qa_pymongo
import pytest as _qa_pytest

QA_RUN_ID = _qa_os.getenv("QA_RUN_ID") or _qa_uuid.uuid4().hex[:12]
TEST_EMAIL_DOMAIN = "@testenv.com"
_qa_email_seq = _qa_itertools.count(1)


def qa_email(role: str = "user") -> str:
    """A fresh, run-scoped address for one role in this run."""
    return f"qa-tester-{role}-{QA_RUN_ID}-{next(_qa_email_seq)}{TEST_EMAIL_DOMAIN}"


def _server_db():
    """The database this test process writes to.

    Resolved the way the APPLICATION resolves it -- DATABASE_NAME, the fleet-standard key
    (CON-001) this program actually reads -- and never through a legacy alias. A cleanup
    pointed at a legacy alias deletes from one database while the writes go to another: it
    runs on every test, looks correct, and removes nothing.
    """
    name = _qa_os.environ["DATABASE_NAME"]
    assert name.endswith("_test"), (
        f"refusing to clean up against {name!r}: not a test database")
    uri = _qa_os.getenv("MONGO_URI") or "mongodb://localhost:27017"
    return _qa_pymongo.MongoClient(uri, serverSelectionTimeoutMS=5000)[name]


@_qa_pytest.fixture(scope="session", autouse=True)
def remove_what_this_run_created():
    """Autouse: cleanup somebody has to remember to invoke is cleanup that will be missed."""
    started = _qa_dt.datetime.now(_qa_dt.timezone.utc)
    yield
    try:
        db = _server_db()
        db.command("ping")
    except Exception:                                                 # noqa: BLE001
        return                       # no database reachable; nothing was written either
    run_scoped_filter = {"email": {"$regex": f"^qa-tester-.*-{QA_RUN_ID}-"},
                         "_id": {"$gte": _QaObjectId.from_datetime(started)}}
    db.users.delete_many(run_scoped_filter)
    # Litter from before this fixture existed. Every address on the reserved test domain
    # is harness-made by construction, so it is swept once here rather than left to grow.
    db.users.delete_many({"email": {"$regex": f"{_qa_re.escape(TEST_EMAIL_DOMAIN)}$"}})
    # Cleanup code is not cleanup proof: a teardown that silently stopped working leaves
    # residue and reports nothing. This fails the run instead.
    remaining = db.users.count_documents(run_scoped_filter)
    assert remaining == 0, f"{remaining} account(s) from run {QA_RUN_ID} survived cleanup"

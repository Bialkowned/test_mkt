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

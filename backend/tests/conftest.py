"""Point the application at a test database BEFORE it is imported.

THE ORDER IS THE WHOLE THING. Settings are read once, at import, and often cached -- so a
redirect written after `from main import app` changes nothing at all: the application has
already resolved and opened the live database by then.

DATABASE_NAME is the fleet-standard key (CON-001), which is why this one assignment is
enough. It is an assignment and not a setdefault: a DATABASE_NAME exported for the running
service would otherwise be inherited, and the suite would write to production.
"""
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

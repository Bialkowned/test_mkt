"""Entry point kept at the old path: the application now lives in app/main.py.

ecosystem.config.js runs `uvicorn main:app` and `python main.py` is the documented
local start, so both still resolve here.
"""

from app.main import BACKEND_PORT, app

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=BACKEND_PORT)

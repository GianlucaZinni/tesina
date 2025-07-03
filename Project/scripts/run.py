# run.py
"""Entry point to run the application using FastAPI and uvicorn."""

import os
import sys
import uvicorn

# Ensure the project root is on the Python path so ``backend`` can be imported
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), os.pardir))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from backend.app.asgi import get_asgi_app


if __name__ == "__main__":
    # `get_asgi_app` will create the underlying Flask app and database
    # tables before returning the ASGI application.
    uvicorn.run(get_asgi_app(), host="0.0.0.0", port=5000)
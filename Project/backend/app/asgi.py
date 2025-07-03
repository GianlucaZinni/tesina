from fastapi import FastAPI
from backend.app import create_app

def get_asgi_app() -> FastAPI:
    app = create_app()
    return app
from fastapi import FastAPI
from fastapi.middleware.wsgi import WSGIMiddleware

from backend.app import create_app, db
from database.scripts.function import load_data


def get_asgi_app(boolean: bool = True) -> FastAPI:
    """Create the ASGI application wrapping the existing Flask app."""
    flask_app = create_app()

    with flask_app.app_context():
        db_uri = flask_app.config["SQLALCHEMY_DATABASE_URI"]
        if db_uri.startswith("sqlite:///"):
            db.create_all()
            if boolean:
                load_data()
        else:
            raise Exception(
                "Unsupported database or incorrect URI (expected SQLite)."
            )

    app = FastAPI()
    app.mount("/", WSGIMiddleware(flask_app))
    return app

__all__ = ["get_asgi_app"]
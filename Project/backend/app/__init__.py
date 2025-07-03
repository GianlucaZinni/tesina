import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging

from backend.app.config import get_config
# from backend.app.db import db
# from backend.app.login_manager import login_manager


def create_app(config_object=None) -> FastAPI:
    if config_object is None:
        config_object = get_config()

    # project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    # templates_path = os.path.join(project_root, "templates")
    # static_path = os.path.join(project_root, "static")
    app = FastAPI()

    # logging.basicConfig(level=logging.DEBUG if app.config.get('DEBUG') else logging.INFO)
    # app.logger.setLevel(logging.DEBUG if app.config.get('DEBUG') else logging.INFO)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://127.0.0.1:5000"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # db.init_app(app)
    # login_manager.init_app(app)

    from backend.app.routes.home.endpoints import router as home_router
    from backend.app.routes.users.endpoints import router as users_router

    app.include_router(home_router)
    app.include_router(users_router)


    return app

__all__ = ["create_app"]

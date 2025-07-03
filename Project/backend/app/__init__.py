from datetime import timedelta
import os
from flask import Flask
from flask_cors import CORS
import logging

from backend.app.config import get_config
from backend.app.db import db
from backend.app.login_manager import login_manager


def create_app(config_object=None):
    """Create and configure the Flask application."""
    if config_object is None:
        config_object = get_config()

    project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    templates_path = os.path.join(project_root, "templates")
    static_path = os.path.join(project_root, "static")
    app = Flask(__name__, template_folder=templates_path, static_folder=static_path)
    app.config.from_object(config_object)

    logging.basicConfig(level=logging.DEBUG if app.config.get('DEBUG') else logging.INFO)
    app.logger.setLevel(logging.DEBUG if app.config.get('DEBUG') else logging.INFO)

    db.init_app(app)
    login_manager.init_app(app)

    app.permanent_session_lifetime = timedelta(days=7)

    CORS(app, origins=["http://127.0.0.1:5000"], supports_credentials=True)

    from backend.app.routes.home.routes import home
    from backend.app.routes.users.routes import users_api
    from backend.app.routes.map.routes import map
    from backend.app.routes.parcelas.endpoints import parcelas
    from backend.app.routes.animals.routes import animals
    from backend.app.routes.collares.routes import collares
    from backend.app.routes.api_gateway.routes import api_gateway
    from backend.app.routes.errors.handlers import errors
    from backend.app.routes.static_files.routes import static_files

    app.register_blueprint(home)
    app.register_blueprint(users_api)
    app.register_blueprint(map)
    app.register_blueprint(parcelas)
    app.register_blueprint(animals)
    app.register_blueprint(collares)
    app.register_blueprint(errors)
    app.register_blueprint(api_gateway)
    app.register_blueprint(static_files)

    return app

__all__ = ["create_app", "db", "login_manager"]
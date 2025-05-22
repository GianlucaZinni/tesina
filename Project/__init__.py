# Project/__init__.py
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager
from flask_cors import CORS
from Project.config import Config
from datetime import timedelta

# Create an ORM connection to the database
db = SQLAlchemy()


# Create a login manager
login_manager = LoginManager()
login_manager.login_view = "login"
login_manager.login_message_category = "info"
login_manager.login_message = "Please, Sign Up"


def create_app(config_class=Config):
    app = Flask(__name__)  # flask app object
    app.config.from_object(Config)  # Configuring from Python Files
    db.init_app(app)  # Initializing the database
    login_manager.init_app(app)
    app.config["SECRET_KEY"] = "hfouewhfoiwefasdasdasdoquw"
    app.config["SESSION_COOKIE_NAME"] = "session"
    app.config["SESSION_COOKIE_HTTPONLY"] = True
    app.config["SESSION_COOKIE_SECURE"] = False
    app.config["SESSION_COOKIE_SAMESITE"] = "Lax"
    app.config["SESSION_COOKIE_DOMAIN"] = "127.0.0.1"  # 👈 ESTO

    app.config["PERMANENT_SESSION_LIFETIME"] = timedelta(days=7)

    CORS(app,
        origins=["http://127.0.0.1:5000"],  # 👈 igual al dominio real
        supports_credentials=True)

    from Project.backend.src.Routes.home.routes import home
    from Project.backend.src.Routes.users.routes import users_api
    from Project.backend.src.Routes.config.routes import config
    from Project.backend.src.Routes.api_gateway.routes import api_gateway
    from Project.backend.src.Routes.data.routes import dashboard
    from Project.backend.src.Routes.errors.handlers import errors
    from Project.backend.src.Routes.static_files.routes import static_files


    app.register_blueprint(home)
    app.register_blueprint(users_api)
    app.register_blueprint(config)
    app.register_blueprint(dashboard)
    app.register_blueprint(errors)
    app.register_blueprint(api_gateway)
    app.register_blueprint(static_files)

    return app

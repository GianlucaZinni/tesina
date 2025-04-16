from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager
from Project.config import Config

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

    from Project.Routes.Home.routes import Home
    from Project.Routes.Users.routes import Users
    from Project.Routes.config.routes import config
    from Project.Routes.Data.routes import Dashboard
    from Project.Routes.errors.handlers import errors

    app.register_blueprint(Home)
    app.register_blueprint(Users)
    app.register_blueprint(config)
    app.register_blueprint(Dashboard)
    app.register_blueprint(errors)

    return app

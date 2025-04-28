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

    from Project.Routes.home.routes import home
    from Project.Routes.users.routes import users
    from Project.Routes.config.routes import config
    from Project.Routes.api_gateway.routes import api_gateway
    from Project.Routes.data.routes import dashboard
    from Project.Routes.errors.handlers import errors
    from Project.Routes.static_files.routes import static_files


    app.register_blueprint(home)
    app.register_blueprint(users)
    app.register_blueprint(config)
    app.register_blueprint(dashboard)
    app.register_blueprint(errors)
    app.register_blueprint(api_gateway)
    app.register_blueprint(static_files)

    return app

from flask_login import LoginManager

login_manager = LoginManager()
login_manager.login_view = 'login'
login_manager.login_message_category = 'info'
login_manager.login_message = 'Please, Sign Up'

__all__ = ['login_manager']
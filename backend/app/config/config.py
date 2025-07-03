import os

class BaseConfig:
    basedir = os.path.abspath(os.path.dirname(__file__))
    ROOT_DIR = os.path.dirname(os.path.dirname(basedir))

    DEBUG = False
    TESTING = False

    sqlite_path = os.path.join(ROOT_DIR, 'database.sqlite')
    SQLALCHEMY_DATABASE_URI = f"sqlite:///{sqlite_path}"

    SECRET_KEY = "1246912zs0d13gh01c577f4dkj234a15"

    UPLOAD_FOLDER = os.path.join(ROOT_DIR, 'backend/app/static/images')

    CSRF_ENABLED = True
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    SESSION_COOKIE_SAMESITE = "Lax"
    SESSION_COOKIE_SECURE = False
    SESSION_COOKIE_DOMAIN = "127.0.0.1"

class ProdConfig(BaseConfig):
    SQLALCHEMY_DATABASE_URI = "not_created_yet"
    SESSION_COOKIE_SECURE = True

class QAConfig(BaseConfig):
    DEBUG = True
    TESTING = True

class DevConfig(BaseConfig):
    DEBUG = True

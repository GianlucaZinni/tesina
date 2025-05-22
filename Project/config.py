# Project/config.py
import os

class Config:
    SECRET_KEY = "1246912zs0d13gh01c577f4dkj234a15"
    basedir = os.path.abspath(os.path.dirname(__file__))
    ROOT_DIR = os.path.dirname(basedir)

    DEBUG = True

    # Ruta al archivo SQLite
    sqlite_path = os.path.join(ROOT_DIR, 'database.sqlite')
    SQLALCHEMY_DATABASE_URI = f"sqlite:///{sqlite_path}"

    UPLOAD_FOLDER = os.path.join(ROOT_DIR, 'Project/static/images')
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    SESSION_COOKIE_SAMESITE = "Lax"
    SESSION_COOKIE_SECURE = False  # True si usás HTTPS
    SESSION_COOKIE_DOMAIN = "127.0.0.1"
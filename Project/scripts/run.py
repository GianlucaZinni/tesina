import os
import sys
import uvicorn

# Ensure the project root is in sys.path
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), os.pardir))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from backend.app.asgi import get_asgi_app
from backend.app.db import engine, Base  # Base = declarative_base()
from database.scripts.function import load_data

# Flag to control whether data should be loaded
LOAD_INITIAL_DATA = True

def initialize_database():
    db_uri = str(engine.url)
    if db_uri.startswith("sqlite:///"):
        print("Creating tables for SQLite database...")
        Base.metadata.create_all(bind=engine)
        if LOAD_INITIAL_DATA:
            print("Loading initial data...")
            load_data()
    else:
        raise Exception("Unsupported database or incorrect URI (expected SQLite).")

if __name__ == "__main__":
    initialize_database()
    uvicorn.run(get_asgi_app(), host="0.0.0.0", port=5000)
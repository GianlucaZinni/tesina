# run.py
from Project import create_app, db
from database.scripts.function import load_data
import os

# Resolve the base directory of the script
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Initialize the app
app = create_app()

boolean = True

with app.app_context():
    db_uri = app.config["SQLALCHEMY_DATABASE_URI"]
    # Verifica que se esté usando SQLite
    if db_uri.startswith("sqlite:///"):
        # Crea todas las tablas definidas en los modelos
        db.create_all()
        if boolean:
            load_data()
    else:
        raise Exception("Unsupported database or incorrect URI (expected SQLite).")

if __name__ == "__main__":
    app.run(debug=True)
        
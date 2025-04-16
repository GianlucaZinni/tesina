from database.scripts.insert.insert_users import populate_users
from database.scripts.insert.static_data import populate_static_data

def insert_data():
    populate_users()
    populate_static_data()
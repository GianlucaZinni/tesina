# ~/Project/access.py
from functools import wraps
from flask import abort
from flask_login import current_user, login_required

def admin_required(f):
    @login_required
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if current_user.id_tipousuario != 1:
            return abort(403)
        return f(*args, **kwargs)
    return decorated_function

def owner_required(f):
    @login_required
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if current_user.id_tipousuario != 2:
            return abort(403)
        return f(*args, **kwargs)
    return decorated_function

def employee_required(f):
    @login_required
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if current_user.id_tipousuario != 3:
            return abort(403)
        return f(*args, **kwargs)
    return decorated_function

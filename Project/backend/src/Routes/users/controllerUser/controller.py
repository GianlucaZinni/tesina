# /Project/backend/Routes/users/controllerUser/controller.py

from flask import flash
from flask_login import login_user
from Project.models import Usuario

def Login(form):

    lowerUsername=form.username.data
    
    user = Usuario.query.filter_by(username=lowerUsername.lower(), password = form.password.data).first()
    if user:
        login_user(user, remember=form.remember.data)
    else:
        flash('No se pudo iniciar sesión. Verifique su correo electrónico y contraseña', 'danger')
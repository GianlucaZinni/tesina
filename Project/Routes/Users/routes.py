from flask import render_template, url_for, redirect, Blueprint
from flask_login import current_user, logout_user
from Project.Routes.users.forms import LoginForm
from Project.Routes.users.controllerUser.controller import Login

users = Blueprint('users', __name__)

@users.route("/")
@users.route("/login", methods=['GET', 'POST'])
def login():
    form = LoginForm()
    if current_user.is_authenticated:
        if current_user.id_tipousuario == 2 or current_user.id_tipousuario == 3:
            return redirect(url_for('UsuarioGestion.admin'))
        return redirect(url_for("home.home_route"))
    
    if form.validate_on_submit():
        Login(form)
        return redirect(url_for('users.login'))
    return render_template('users/login.html', title='Login', form=form)


@users.route("/logout")
def logout():
    logout_user()
    return redirect(url_for('users.login'))
from flask import render_template, url_for, redirect, Blueprint
from flask_login import current_user, logout_user
from Project.Routes.Users.forms import LoginForm
from Project.Routes.Users.controllerUser.controller import Login

Users = Blueprint('Users', __name__)

@Users.route("/")
@Users.route("/login", methods=['GET', 'POST'])
def login():
    form = LoginForm()
    if current_user.is_authenticated:
        if current_user.id_tipousuario == 2 or current_user.id_tipousuario == 3:
            return redirect(url_for('UsuarioGestion.admin'))
        return redirect(url_for("Home.home"))
    
    if form.validate_on_submit():
        Login(form)
        return redirect(url_for('Users.login'))
    return render_template('users/login.html', title='Login', form=form)


@Users.route("/logout")
def logout():
    logout_user()
    return redirect(url_for('Users.login'))
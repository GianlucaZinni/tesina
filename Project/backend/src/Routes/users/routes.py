# ~/Project/backend/src/Routes/users/routes.py
from flask import Blueprint, request, jsonify, session
from flask_login import login_user, logout_user, current_user, login_required
from Project.models import Usuario
from werkzeug.security import check_password_hash

users_api = Blueprint("users_api", __name__, url_prefix="/api/user")


@users_api.route("/login", methods=["POST"])
def login():
    if current_user.is_authenticated:
        return jsonify({"status": "ok", "message": "Ya estás autenticado."}), 200

    data = request.get_json()
    username = data.get("username")
    password = data.get("password")

    print(data)

    if not username or not password:
        return jsonify({"status": "error", "message": "Faltan credenciales."}), 400

    user = Usuario.query.filter_by(username=username).first()

    if not user:
        return jsonify({"status": "error", "message": "Usuario no encontrado."}), 401

    # if not check_password_hash(user.password, password):
    #     return jsonify({"status": "error", "message": "Contraseña incorrecta."}), 401

    login_user(user, remember=True)  # esto fuerza la cookie a persistir
    session.permanent = True
    return jsonify({
        "status": "ok",
        "message": "Inicio de sesión exitoso",
        "user": {
            "id": user.id,
            "username": user.username,
            "role": user.id_tipousuario
        }
    })


@users_api.route("/logout", methods=["POST"])
def logout():
    print("?")
    logout_user()
    return jsonify({"status": "ok", "message": "Sesión cerrada correctamente"})


@users_api.route("/session", methods=["GET"])
def session_status():
    if current_user.is_authenticated:
        return jsonify({
            "authenticated": True,
            "user": {
                "id": current_user.id,
                "username": current_user.username,
                "role": current_user.id_tipousuario
            }
        })
    return jsonify({"authenticated": False}), 401

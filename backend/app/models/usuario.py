from sqlalchemy import Column, String, Integer, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from backend.app import db, login_manager
from flask_login import UserMixin
from flask import abort

from .tipo_usuario import TipoUsuario

@login_manager.user_loader
def user_loader(user_id):
    return Usuario.query.filter_by(id=user_id).first()

@login_manager.unauthorized_handler
def unauthorized_callback():
    abort(401)

class Usuario(UserMixin, db.Model):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(100), nullable=False)
    attribute = Column(Boolean, nullable=False, default=True)
    password = Column(String(100), nullable=False)
    id_tipousuario = Column(Integer, ForeignKey("tipos_usuarios.id_tipousuario"))

    tipousuario = relationship("TipoUsuario")
    campos = relationship('Campo', backref='usuario', lazy=True)
    asignaciones_realizadas = relationship(
        "AsignacionCollar",
        backref="usuario_asignador",
        lazy=True,
    )

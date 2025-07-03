from sqlalchemy import Column, String, Integer, Boolean, ForeignKey
from sqlalchemy.orm import relationship

from backend.app.db import Base

class Usuario(Base):
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
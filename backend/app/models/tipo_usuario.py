from sqlalchemy import Column, String, Integer
from backend.app import db

class TipoUsuario(db.Model):
    __tablename__ = "tipos_usuarios"
    id_tipousuario = Column(Integer, primary_key=True)
    tipousuario = Column(String(50), nullable=False)

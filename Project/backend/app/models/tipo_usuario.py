from sqlalchemy import Column, String, Integer

from backend.app.db import Base

class TipoUsuario(Base):
    __tablename__ = "tipos_usuarios"
    id_tipousuario = Column(Integer, primary_key=True)
    tipousuario = Column(String(50), nullable=False)
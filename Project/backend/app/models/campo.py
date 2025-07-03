from sqlalchemy import Column, String, Integer, Float, Boolean, ForeignKey
from backend.app.db import Base

class Campo(Base):
    __tablename__ = 'campos'
    id = Column(Integer, primary_key=True)
    nombre = Column(String(100), nullable=False)
    descripcion = Column(String(200))
    lat = Column(Float)
    lon = Column(Float)
    is_preferred = Column(Boolean, default=False)
    usuario_id = Column(Integer, ForeignKey('usuarios.id'), nullable=False)
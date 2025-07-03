from sqlalchemy import Column, String, Integer, Date, ForeignKey
from sqlalchemy.orm import relationship
from backend.app import db

class Persona(db.Model):
    __tablename__ = "personas"
    id_persona = Column(Integer, primary_key=True, autoincrement=True)
    nombre = Column(String(50), nullable=False)
    apellido = Column(String(50), nullable=False)
    dni = Column(String(20), nullable=False)
    cumpleanios = Column(Date)
    id = Column(Integer, ForeignKey("usuarios.id"))
    usuario = relationship("Usuario")
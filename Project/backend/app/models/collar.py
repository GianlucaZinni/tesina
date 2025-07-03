from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from backend.app import db

class Collar(db.Model):
    __tablename__ = 'collares'
    id = Column(Integer, primary_key=True)
    codigo = Column(String(50), unique=True, nullable=False)
    bateria = Column(Float)
    ultima_actividad = Column(DateTime)
    estado_collar_id = Column(Integer, ForeignKey('estado_collar_animales.id'), nullable=False)

    asignaciones = relationship('AsignacionCollar', backref='collar', lazy=True, cascade='all, delete-orphan')
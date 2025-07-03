from sqlalchemy import Column, Float, Integer, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from backend.app import db

class UbicacionActual(db.Model):
    __tablename__ = 'ubicacion_actual'
    id = Column(Integer, primary_key=True)
    animal_id = Column(Integer, ForeignKey('animales.id'), unique=True)
    timestamp = Column(DateTime)
    lat = Column(Float)
    lon = Column(Float)

    animal = relationship('Animal', backref='ubicacion_actual', uselist=False)

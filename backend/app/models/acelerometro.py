from sqlalchemy import Column, Float, Integer, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from backend.app import db

class Acelerometro(db.Model):
    __tablename__ = 'aceleraciones'
    id = Column(Integer, primary_key=True)
    timestamp = Column(DateTime)
    x = Column(Float)
    y = Column(Float)
    z = Column(Float)

    collar_id = Column(Integer, ForeignKey('collares.id'))
    collar = relationship('Collar', backref='aceleraciones')

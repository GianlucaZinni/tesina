from sqlalchemy import Column, Float, Integer, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from backend.app.db import Base

class Acelerometro(Base):
    __tablename__ = 'aceleraciones'
    id = Column(Integer, primary_key=True)
    timestamp = Column(DateTime)
    x = Column(Float)
    y = Column(Float)
    z = Column(Float)

    collar_id = Column(Integer, ForeignKey('collares.id'))
    collar = relationship('Collar', backref='aceleraciones')
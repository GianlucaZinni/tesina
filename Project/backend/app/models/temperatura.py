from sqlalchemy import Column, Float, Integer, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from backend.app.db import Base

class Temperatura(Base):
    __tablename__ = 'temperaturas'
    id = Column(Integer, primary_key=True)
    timestamp = Column(DateTime)
    corporal = Column(Float)
    ambiente = Column(Float)

    collar_id = Column(Integer, ForeignKey('collares.id'))
    collar = relationship('Collar', backref='temperaturas')
from sqlalchemy import Column, Float, Integer, DateTime, ForeignKey
from backend.app import db

class Ubicacion(db.Model):
    __tablename__ = 'ubicaciones'

    __table_args__ = (
        db.Index('idx_collar_timestamp', 'collar_id', 'timestamp'),
    )

    id = Column(Integer, primary_key=True)
    timestamp = Column(DateTime, index=True)
    lat = Column(Float)
    lon = Column(Float)

    collar_id = Column(Integer, ForeignKey('collares.id'), nullable=False)

from sqlalchemy import Column, Float, Integer, DateTime, ForeignKey, Index
from backend.app.db import Base

class Ubicacion(Base):
    __tablename__ = 'ubicaciones'

    __table_args__ = (
        Index('idx_collar_timestamp', 'collar_id', 'timestamp'),
    )

    id = Column(Integer, primary_key=True)
    timestamp = Column(DateTime, index=True)
    lat = Column(Float)
    lon = Column(Float)

    collar_id = Column(Integer, ForeignKey('collares.id'), nullable=False)
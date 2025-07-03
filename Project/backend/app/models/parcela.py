from sqlalchemy import Column, String, Integer, Float, Text, ForeignKey
from sqlalchemy.orm import relationship
from backend.app.db import Base

class Parcela(Base):
    __tablename__ = 'parcelas'
    id = Column(Integer, primary_key=True)
    nombre = Column(String(100))
    descripcion = Column(String(200))
    perimetro_geojson = Column(Text)
    area = Column(Float)
    campo_id = Column(Integer, ForeignKey('campos.id'), nullable=False)
    campo = relationship('Campo', backref='parcelas', lazy=True)

    def __repr__(self):
        return f"<Parcela {self.nombre} (Campo: {self.campo.nombre})>"
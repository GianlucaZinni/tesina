from sqlalchemy import Column, String, Integer, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from backend.app.db import Base

class Tipo(Base):
    __tablename__ = 'tipos_animales'
    id = Column(Integer, primary_key=True)
    nombre = Column(String(50), nullable=False)
    especie_id = Column(Integer, ForeignKey('especies_animales.id'), nullable=False)
    razas = relationship('Raza', backref='tipo', lazy=True)

    __table_args__ = (
        UniqueConstraint('nombre', 'especie_id', name='uix_tipo_nombre_especie'),
    )

    def __repr__(self):
        return f"<Tipo {self.nombre} (Especie: {self.especie.nombre})>"
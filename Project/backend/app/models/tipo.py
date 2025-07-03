from sqlalchemy import Column, String, Integer, ForeignKey
from sqlalchemy.orm import relationship
from backend.app import db

class Tipo(db.Model):
    __tablename__ = 'tipos_animales'
    id = Column(Integer, primary_key=True)
    nombre = Column(String(50), nullable=False)
    especie_id = Column(Integer, ForeignKey('especies_animales.id'), nullable=False)
    razas = relationship('Raza', backref='tipo', lazy=True)

    __table_args__ = (
        db.UniqueConstraint('nombre', 'especie_id', name='uix_tipo_nombre_especie'),
    )

    def __repr__(self):
        return f"<Tipo {self.nombre} (Especie: {self.especie.nombre})>"
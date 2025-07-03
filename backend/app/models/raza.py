from sqlalchemy import Column, String, Integer, ForeignKey
from sqlalchemy.orm import relationship
from backend.app import db

class Raza(db.Model):
    __tablename__ = 'razas_animales'
    id = Column(Integer, primary_key=True)
    nombre = Column(String(50), nullable=False)
    especie_id = Column(Integer, ForeignKey('especies_animales.id'), nullable=False)
    tipo_id = Column(Integer, ForeignKey('tipos_animales.id'), nullable=False)
    animales = relationship('Animal', backref='raza', lazy=True)

    def __repr__(self):
        return f"<Raza {self.nombre} (Tipo: {self.tipo.nombre})>"

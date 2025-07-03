from sqlalchemy import Column, String, Integer, ForeignKey
from backend.app import db

class EstadoReproductivo(db.Model):
    __tablename__ = 'estado_reproductivo_animales'
    id = Column(Integer, primary_key=True)
    nombre = Column(String(50), nullable=False)
    sexo_id = Column(Integer, ForeignKey('sexos_animales.id'), nullable=False)
    especie_id = Column(Integer, ForeignKey('especies_animales.id'), nullable=False)

    def __repr__(self):
        return f"<EstadoReproductivo {self.nombre}>"
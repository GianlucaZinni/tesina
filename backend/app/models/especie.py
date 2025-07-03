from sqlalchemy import Column, String, Integer
from sqlalchemy.orm import relationship
from backend.app import db

class Especie(db.Model):
    __tablename__ = 'especies_animales'
    id = Column(Integer, primary_key=True)
    nombre = Column(String(50), nullable=False, unique=True)
    tipos = relationship("Tipo", backref="especie", lazy=True)
    razas = relationship("Raza", backref="especie", lazy=True)
    estados_reproductivos = relationship("EstadoReproductivo", backref="especie", lazy=True)

    def __repr__(self):
        return f"<Especie {self.nombre}>"

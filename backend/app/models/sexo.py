from sqlalchemy import Column, String, Integer
from sqlalchemy.orm import relationship
from backend.app import db

class Sexo(db.Model):
    __tablename__ = 'sexos_animales'
    id = Column(Integer, primary_key=True)
    nombre = Column(String(50), nullable=False)
    estados_reproductivos = relationship('EstadoReproductivo', backref='sexo', lazy=True)

    def __repr__(self):
        return f"<Sexo {self.nombre}>"

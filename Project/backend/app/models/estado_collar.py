from sqlalchemy import Column, String, Integer
from sqlalchemy.orm import relationship
from backend.app import db

class EstadoCollar(db.Model):
    __tablename__ = 'estado_collar_animales'
    id = Column(Integer, primary_key=True)
    nombre = Column(String(50), nullable=False)
    collares = relationship('Collar', backref='estado_collar', lazy=True)

    def __repr__(self):
        return f"<EstadoCollar {self.nombre}>"
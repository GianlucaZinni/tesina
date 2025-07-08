from sqlalchemy import Column, String, Integer, Date, Float, ForeignKey
from sqlalchemy.orm import relationship
from backend.app.db import Base
from typing import Optional, List
from datetime import date
from pydantic import BaseModel

class Animal(Base):
    __tablename__ = 'animales'
    id = Column(Integer, primary_key=True)
    nombre = Column(String(50), nullable=False)
    numero_identificacion = Column(String(50), unique=True)
    fecha_nacimiento = Column(Date)

    # Zoometria
    peso = Column(Float)
    altura_cruz = Column(Float)
    longitud_tronco = Column(Float)
    perimetro_toracico = Column(Float)
    ancho_grupa = Column(Float)
    longitud_grupa = Column(Float)

    # Reproduccion
    estado_reproductivo_id = Column(Integer, ForeignKey('estado_reproductivo_animales.id'))
    estado_reproductivo = relationship('EstadoReproductivo', backref='animales', lazy=True)
    numero_partos = Column(Integer)
    intervalo_partos = Column(Integer)
    fertilidad = Column(Float)
    ubicacion_sensor = Column(String(100))

    # Relaciones
    parcela_id = Column(Integer, ForeignKey('parcelas.id'))
    parcela = relationship('Parcela', backref='animales', lazy=True)
    raza_id = Column(Integer, ForeignKey('razas_animales.id'))
    sexo_id = Column(Integer, ForeignKey('sexos_animales.id'))
    sexo = relationship('Sexo', backref='animales', lazy=True)
    asignaciones_collar = relationship(
        'AsignacionCollar',
        backref='animal',
        lazy=True,
        cascade='all, delete-orphan',
    )

class AnimalCreate(BaseModel):
    nombre: str
    numero_identificacion: Optional[str] = None
    acronimo_identificacion: Optional[str] = None
    fecha_nacimiento: Optional[date] = None
    peso: Optional[float] = None
    altura_cruz: Optional[float] = None
    longitud_tronco: Optional[float] = None
    perimetro_toracico: Optional[float] = None
    ancho_grupa: Optional[float] = None
    longitud_grupa: Optional[float] = None
    estado_reproductivo_id: Optional[int] = None
    numero_partos: Optional[int] = None
    intervalo_partos: Optional[int] = None
    fertilidad: Optional[float] = None
    ubicacion_sensor: Optional[str] = None
    parcela_id: Optional[int] = None
    raza_id: Optional[int] = None
    sexo_id: Optional[int] = None


class AnimalUpdate(AnimalCreate):
    nombre: Optional[str] = None


class AnimalBatchDelete(BaseModel):
    ids: List[int]
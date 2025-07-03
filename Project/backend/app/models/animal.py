from sqlalchemy import Column, String, Integer, Date, Float, ForeignKey
from sqlalchemy.orm import relationship
from backend.app import db

class Animal(db.Model):
    __tablename__ = 'animales'
    id = Column(Integer, primary_key=True)
    nombre = Column(String(50), nullable=False)
    numero_identificacion = Column(String(50), unique=True)
    fecha_nacimiento = Column(Date)

    # Zoometría
    peso = Column(Float)
    altura_cruz = Column(Float)
    longitud_tronco = Column(Float)
    perimetro_toracico = Column(Float)
    ancho_grupa = Column(Float)
    longitud_grupa = Column(Float)

    # Reproducción
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
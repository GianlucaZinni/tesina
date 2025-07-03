from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from backend.app import db
from datetime import datetime

class NodoAutorizado(db.Model):
    __tablename__ = 'nodos_autorizados'
    id = Column(Integer, primary_key=True)
    collar_id = Column(Integer, ForeignKey('collares.id'), unique=True, nullable=False)

    client_id = Column(String(100), unique=True, nullable=False)
    certificado_cn = Column(String(100), nullable=True)
    esta_autorizado = Column(Boolean, default=False)
    fecha_autorizacion = Column(DateTime, default=datetime.now)

    usuario_id = Column(Integer, ForeignKey('usuarios.id'))
    observaciones = Column(Text)

    collar = relationship('Collar', backref='nodo_autorizado', uselist=False)
    usuario = relationship('Usuario')
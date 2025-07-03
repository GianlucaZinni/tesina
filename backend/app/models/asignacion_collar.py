from sqlalchemy import Column, String, Integer, DateTime, ForeignKey
from backend.app import db
from datetime import datetime

class AsignacionCollar(db.Model):
    __tablename__ = 'asignaciones_collar'
    id = Column(Integer, primary_key=True)
    collar_id = Column(Integer, ForeignKey('collares.id'), nullable=False)
    animal_id = Column(Integer, ForeignKey('animales.id'), nullable=False)
    usuario_id = Column(Integer, ForeignKey('usuarios.id'))
    fecha_inicio = Column(DateTime, nullable=False, default=datetime.now)
    fecha_fin = Column(DateTime)
    motivo_cambio = Column(String(100))

    __table_args__ = (
        db.UniqueConstraint('collar_id', 'fecha_fin', name='uq_collar_activo'),
    )

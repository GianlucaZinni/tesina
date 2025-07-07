from typing import Optional, List
from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from backend.app.db import Base
from pydantic import BaseModel, Field


class Collar(Base):
    __tablename__ = "collares"
    id = Column(Integer, primary_key=True)
    codigo = Column(String(50), unique=True, nullable=False)
    bateria = Column(Float)
    ultima_actividad = Column(DateTime)
    estado_collar_id = Column(
        Integer, ForeignKey("estado_collar_animales.id"), nullable=False
    )

    asignaciones = relationship(
        "AsignacionCollar", backref="collar", lazy=True, cascade="all, delete-orphan"
    )


class CollarCreate(BaseModel):
    codigo: str = Field(..., alias="identificador")
    cantidad: int

    class Config:
        allow_population_by_field_name = True


class CollarUpdate(BaseModel):
    estado: Optional[int] = None


class CollarAssign(BaseModel):
    animal_id: Optional[int] = None


class CollarState(BaseModel):
    id: int
    nombre: str


class CollarBatchDelete(BaseModel):
    ids: List[int]

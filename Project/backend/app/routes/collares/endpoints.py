from typing import List, Optional
from datetime import datetime
from io import StringIO
import csv

from fastapi import APIRouter, Depends, HTTPException
from fastapi import UploadFile, File
from sqlalchemy.orm import Session
from pydantic import BaseModel

from backend.app.db import get_db
from backend.app.models import (
    Collar,
    AsignacionCollar,
    Animal,
    EstadoCollar,
)
from backend.app.models.usuario import Usuario
from backend.app.login_manager import get_current_user
from .functions import _load_collar_states

router = APIRouter(prefix="/api/collares")

# Registramos un callback que se ejecuta antes de la primera solicitud
# Esto asegura que db esté inicializado y en un contexto de aplicación

class CollarCreate(BaseModel):
    codigo: str


class CollarUpdate(BaseModel):
    estado_id: Optional[int] = None
    bateria: Optional[float] = None


class CollarAssign(BaseModel):
    animal_id: Optional[int] = None


class CollarOut(BaseModel):
    id: int
    codigo: str
    bateria: Optional[float] = None
    ultima_actividad: Optional[datetime] = None
    estado_collar_id: int
    animal_id: Optional[int] = None
    animal_nombre: Optional[str] = None

    class Config:
        orm_mode = True


def _get_estado_id(db: Session, nombre: str) -> int:
    estado = (
        db.query(EstadoCollar)
        .filter(EstadoCollar.nombre.ilike(nombre))
        .first()
    )
    if not estado:
        raise HTTPException(500, f"Estado '{nombre}' no encontrado")
    return estado.id


@router.get("/", response_model=List[CollarOut])
def list_collares(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    collares = db.query(Collar).all()
    result: List[CollarOut] = []
    for c in collares:
        asignacion = (
            db.query(AsignacionCollar)
            .filter_by(collar_id=c.id, fecha_fin=None)
            .first()
        )
        animal = db.get(Animal, asignacion.animal_id) if asignacion else None
        result.append(
            CollarOut(
                id=c.id,
                codigo=c.codigo,
                bateria=c.bateria,
                ultima_actividad=c.ultima_actividad,
                estado_collar_id=c.estado_collar_id,
                animal_id=animal.id if animal else None,
                animal_nombre=animal.nombre if animal else None,
            )
        )
    return result


@router.get("/available", response_model=List[CollarOut])
def list_available(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    disponible_id = _get_estado_id(db, "disponible")
    assigned = (
        db.query(AsignacionCollar.collar_id)
        .filter(AsignacionCollar.fecha_fin.is_(None))
        .subquery()
    )
    collares = (
        db.query(Collar)
        .filter(Collar.estado_collar_id == disponible_id, ~Collar.id.in_(assigned))
        .all()
    )
    return [
        CollarOut(
            id=c.id,
            codigo=c.codigo,
            bateria=c.bateria,
            ultima_actividad=c.ultima_actividad,
            estado_collar_id=c.estado_collar_id,
        )
        for c in collares
    ]


@router.post("/", response_model=CollarOut)
def create_collar(
    data: CollarCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    disponible_id = _get_estado_id(db, "disponible")
    nuevo = Collar(
        codigo=data.codigo,
        bateria=100.0,
        ultima_actividad=datetime.utcnow(),
        estado_collar_id=disponible_id,
    )
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return CollarOut.from_orm(nuevo)


@router.get("/{collar_id}", response_model=CollarOut)
def get_collar(
    collar_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    collar = db.get(Collar, collar_id)
    if not collar:
        raise HTTPException(status_code=404, detail="Collar no encontrado")
    asignacion = (
        db.query(AsignacionCollar)
        .filter_by(collar_id=collar.id, fecha_fin=None)
        .first()
    )
    animal = db.get(Animal, asignacion.animal_id) if asignacion else None
    return CollarOut(
        id=collar.id,
        codigo=collar.codigo,
        bateria=collar.bateria,
        ultima_actividad=collar.ultima_actividad,
        estado_collar_id=collar.estado_collar_id,
        animal_id=animal.id if animal else None,
        animal_nombre=animal.nombre if animal else None,
    )


@router.put("/{collar_id}", response_model=CollarOut)
def update_collar(
    collar_id: int,
    data: CollarUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    collar = db.get(Collar, collar_id)
    if not collar:
        raise HTTPException(status_code=404, detail="Collar no encontrado")
    if data.estado_id is not None:
        collar.estado_collar_id = data.estado_id
    if data.bateria is not None:
        collar.bateria = data.bateria
    collar.ultima_actividad = datetime.utcnow()
    db.commit()
    db.refresh(collar)
    return CollarOut.from_orm(collar)


@router.delete("/{collar_id}")
def delete_collar(
    collar_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    collar = db.get(Collar, collar_id)
    if not collar:
        raise HTTPException(status_code=404, detail="Collar no encontrado")
    db.delete(collar)
    db.commit()
    return {"status": "ok"}


@router.post("/{collar_id}/assign")
def assign_collar(
    collar_id: int,
    data: CollarAssign,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    collar = db.get(Collar, collar_id)
    if not collar:
        raise HTTPException(status_code=404, detail="Collar no encontrado")

    asignacion_actual = (
        db.query(AsignacionCollar)
        .filter_by(collar_id=collar_id, fecha_fin=None)
        .first()
    )
    if asignacion_actual:
        asignacion_actual.fecha_fin = datetime.utcnow()

    if data.animal_id:
        asignacion_animal = (
            db.query(AsignacionCollar)
            .filter_by(animal_id=data.animal_id, fecha_fin=None)
            .first()
        )
        if asignacion_animal:
            asignacion_animal.fecha_fin = datetime.utcnow()
        nueva = AsignacionCollar(
            collar_id=collar_id,
            animal_id=data.animal_id,
            usuario_id=current_user.id,
            fecha_inicio=datetime.utcnow(),
        )
        collar.estado_collar_id = _get_estado_id(db, "activo")
        db.add(nueva)
    else:
        collar.estado_collar_id = _get_estado_id(db, "disponible")

    db.commit()
    return {"status": "ok"}


@router.get("/estados", response_model=List[dict])
def list_estados(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    estados = db.query(EstadoCollar).all()
    return [{"id": e.id, "nombre": e.nombre} for e in estados]


@router.get("/export/template")
def export_template(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    output = StringIO()
    writer = csv.writer(output)
    writer.writerow(["Codigo", "ID Animal Asignado (opcional)"])
    return output.getvalue()


@router.post("/import")
def import_collares(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    content = file.file.read().decode()
    reader = csv.reader(StringIO(content))
    next(reader, None)
    disponible_id = _get_estado_id(db, "disponible")
    created = 0
    for row in reader:
        codigo = row[0].strip().upper()
        if not codigo:
            continue
        existing = db.query(Collar).filter_by(codigo=codigo).first()
        if existing:
            continue
        collar = Collar(
            codigo=codigo,
            bateria=100.0,
            ultima_actividad=datetime.utcnow(),
            estado_collar_id=disponible_id,
        )
        db.add(collar)
        created += 1
    db.commit()
    return {"status": "ok", "created": created}


@router.get("/export")
def export_collares(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    collares = db.query(Collar).all()
    output = StringIO()
    writer = csv.writer(output)
    writer.writerow(["Codigo", "ID Animal Asignado (opcional)"])
    for c in collares:
        asignacion = (
            db.query(AsignacionCollar)
            .filter_by(collar_id=c.id, fecha_fin=None)
            .first()
        )
        animal = asignacion.animal_id if asignacion else ""
        writer.writerow([c.codigo, animal])
    return output.getvalue()
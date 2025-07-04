from datetime import datetime
from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session

from backend.app.db import get_db
from backend.app.models import (
    AsignacionCollar,
    EstadoCollar,
)
from backend.app.models.collar import Collar

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def get_estado_id(nombre: str, db: Session = Depends(get_db)) -> int:
    estado = db.query(EstadoCollar).filter(EstadoCollar.nombre.ilike(nombre)).first()
    if not estado:
        raise HTTPException(500, f"Estado '{nombre}' no encontrado")
    return estado.id


def get_estado_nombre(id: str, db: Session = Depends(get_db)) -> int:
    estado = db.query(EstadoCollar).filter(EstadoCollar.id).first()
    if not estado:
        raise HTTPException(500, f"Estado '{id}' no encontrado")
    return estado.id

def create_new_collar_logic(codigo, db: Session = Depends(get_db)):
    """Crea un nuevo collar con estado 'disponible' y batería 100%."""
    new_collar = Collar(
        codigo=codigo,
        estado_collar_id=2,
        bateria=100.0,
        ultima_actividad=datetime.now(),
    )
    db.add(new_collar)
    db.flush()
    return new_collar

def end_active_assignment(assignment, db: Session = Depends(get_db)):
    """Finaliza una asignación activa."""
    if assignment and assignment.fecha_fin is None:
        assignment.fecha_fin = datetime.now()
        db.add(assignment)

        old_collar = db.query(Collar).get(assignment.collar_id)
        if old_collar and old_collar.estado_collar_id not in [get_estado_id("sin bateria"), get_estado_id("defectuoso")]:
            old_collar.estado_collar_id = get_estado_id("disponible")
            db.add(old_collar)
    
def create_new_assignment_logic(collar_id, animal_id, usuario_id, db: Session = Depends(get_db)):
    """Crea una nueva asignación de collar y pone el collar en estado 'activo'."""
    if not "activo":
        raise ValueError("Estado 'activo' no configurado en la base de datos.")

    new_assignment = AsignacionCollar(
        animal_id=animal_id,
        collar_id=collar_id,
        usuario_id=usuario_id,
        fecha_inicio=datetime.now(),
        fecha_fin=None,
    )
    db.add(new_assignment)

    collar = db.query(Collar).get(collar_id)
    if collar and collar.estado_collar_id != get_estado_id("activo"):
        collar.estado_collar_id = get_estado_id("activo")
        db.add(collar)
    return new_assignment

def assign_collar(collar, animal_to_assign, current_user_id, db: Session = Depends(get_db)):
    """
    Gestiona la asignación de un collar a un animal.
    Finaliza asignaciones previas si es necesario.
    """
    # 1. Finalizar asignación activa del COLLAR (si este collar ya estaba asignado)
    current_collar_assignment = db.query(AsignacionCollar).filter_by(
        collar_id=collar.id, fecha_fin=None
    ).first()
    end_active_assignment(current_collar_assignment)

    # 2. Si hay un animal_to_assign, asignarlo
    if animal_to_assign:
        # Finalizar cualquier asignación activa del ANIMAL (si el animal ya tiene otro collar)
        existing_animal_assignment = db.query(AsignacionCollar).filter_by(
            animal_id=animal_to_assign.id, fecha_fin=None
        ).first()
        end_active_assignment(existing_animal_assignment)

        # Crear la nueva asignación
        create_new_assignment_logic(collar.id, animal_to_assign.id, current_user_id)
    else: # Si animal_to_assign es None, el collar queda desasignado y pasa a disponible
        if collar.estado_collar_id not in [get_estado_id("sin bateria"), get_estado_id("defectuoso")]:
            collar.estado_collar_id = get_estado_id("disponible")
            db.add(collar)

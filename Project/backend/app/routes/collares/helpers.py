import re
from datetime import datetime
from fastapi import HTTPException
from sqlalchemy.orm import Session
from backend.app.models import (
    Collar,
    AsignacionCollar,
    EstadoCollar,
    Animal,
)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def get_estado_id(nombre: str, db: Session) -> int:
    """Return state ID by name, raising 500 if not found."""
    estado = db.query(EstadoCollar).filter(EstadoCollar.nombre.ilike(nombre)).first()
    if not estado:
        raise HTTPException(500, f"Estado '{nombre}' no encontrado")
    return estado.id


def get_estado_nombre(estado_id: int, db: Session) -> str:
    """Return state name by id, raising 500 if not found."""
    estado = db.query(EstadoCollar).filter(EstadoCollar.id == estado_id).first()
    if not estado:
        raise HTTPException(500, f"Estado '{estado_id}' no encontrado")
    return estado.nombre


def create_new_collar_logic(codigo, db: Session):
    """Crea un nuevo collar con estado 'disponible' y batería 100%."""
    estado_disponible = get_estado_id("disponible", db)
    new_collar = Collar(
        codigo=codigo,
        estado_collar_id=estado_disponible,
        bateria=100.0,
        ultima_actividad=datetime.now(),
    )
    db.add(new_collar)
    db.flush()
    return new_collar


def end_active_assignment(assignment, db: Session):
    """Finaliza una asignación activa."""
    if assignment and assignment.fecha_fin is None:
        assignment.fecha_fin = datetime.now()
        db.add(assignment)

        old_collar = db.get(Collar, assignment.collar_id)
        if old_collar and old_collar.estado_collar_id not in [
            get_estado_id("sin bateria", db),
            get_estado_id("defectuoso", db),
        ]:
            old_collar.estado_collar_id = get_estado_id("disponible", db)
            db.add(old_collar)


def create_new_assignment_logic(collar_id, animal_id, usuario_id, db: Session):
    """Crea una nueva asignación de collar y pone el collar en estado 'activo'."""
    estado_activo = get_estado_id("activo", db)
    if estado_activo is None:
        raise ValueError("Estado 'activo' no configurado en la base de datos.")

    new_assignment = AsignacionCollar(
        animal_id=animal_id,
        collar_id=collar_id,
        usuario_id=usuario_id,
        fecha_inicio=datetime.now(),
        fecha_fin=None,
    )
    db.add(new_assignment)

    collar = db.get(Collar, collar_id)
    if collar and collar.estado_collar_id != estado_activo:
        collar.estado_collar_id = estado_activo
        db.add(collar)
    return new_assignment


def assign_collar(collar, animal_to_assign, current_user_id, db: Session):
    """Asigna o desasigna un collar de un animal y devuelve detalles de la operación."""

    # 1. Finalizar asignación activa del COLLAR (si este collar ya estaba asignado)
    current_collar_assignment = db.query(AsignacionCollar).filter_by(
        collar_id=collar.id, fecha_fin=None
    ).first()
    unassigned_from = None
    if current_collar_assignment:
        animal_prev = db.get(Animal, current_collar_assignment.animal_id)
        unassigned_from = animal_prev.nombre if animal_prev else None
    end_active_assignment(current_collar_assignment, db)

    assigned_to = None
    replaced_collar = None

    # 2. Si hay un animal_to_assign, asignarlo
    if animal_to_assign:
        # Finalizar cualquier asignación activa del ANIMAL (si el animal ya tiene otro collar)
        existing_animal_assignment = db.query(AsignacionCollar).filter_by(
            animal_id=animal_to_assign.id, fecha_fin=None
        ).first()
        if existing_animal_assignment:
            prev_collar = db.get(Collar, existing_animal_assignment.collar_id)
            replaced_collar = prev_collar.codigo if prev_collar else None
        end_active_assignment(existing_animal_assignment, db)

        # Crear la nueva asignación
        create_new_assignment_logic(
            collar.id, animal_to_assign.id, current_user_id, db
        )
        assigned_to = animal_to_assign.nombre
    else:  # Si animal_to_assign es None, el collar queda desasignado y pasa a disponible
        if collar.estado_collar_id not in [
            get_estado_id("sin bateria", db),
            get_estado_id("defectuoso", db),
        ]:
            collar.estado_collar_id = get_estado_id("disponible", db)
            db.add(collar)

    return {
        "assigned_to": assigned_to,
        "unassigned_from": unassigned_from,
        "replaced_collar": replaced_collar,
    }

def sanitize_and_validate_collar_code(raw_codigo: str):
    """
    Limpia y valida el código de collar. Devuelve el código limpio y una lista de errores si los hay.
    Reglas:
    - 4 letras en mayúscula, guion, y número de 5 cifras.
    - Letras se convierten a mayúscula automáticamente.
    """
    errores = []
    raw_codigo = raw_codigo.strip()
    match = re.match(r"^([a-zA-Z]{1,4})-(\d{1,5})$", raw_codigo)
    if not match:
        errores.append({"field": "Codigo", "value": raw_codigo, "message": "Formato inválido. Debe ser AAAA-00001"})
        return raw_codigo, errores

    letras, numero = match.group(1).upper(), match.group(2).zfill(5)
    if len(letras) != 4:
        errores.append({"field": "Codigo", "value": raw_codigo, "message": "El prefijo debe tener exactamente 4 letras mayúsculas"})

    if int(numero) > 99999:
        errores.append({"field": "Codigo", "value": raw_codigo, "message": "El número debe estar entre 00000 y 99999"})

    return f"{letras}-{numero}", errores
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
    """Asigna/desasigna un collar gestionando cambios necesarios.

    Devuelve una tupla ``(changed, message)`` donde ``changed`` indica si se
    realizaron modificaciones en la base de datos y ``message`` resume lo
    ocurrido para notificar al usuario.
    """

    messages = []
    changed = False

    # Asignación actualmente activa del collar (si existe)
    current_assignment = (
        db.query(AsignacionCollar)
        .filter_by(collar_id=collar.id, fecha_fin=None)
        .first()
    )

    current_animal = (
        db.get(Animal, current_assignment.animal_id) if current_assignment else None
    )

    if animal_to_assign is None:
        # Solicitud de desasignación
        if current_assignment:
            end_active_assignment(current_assignment, db)
            changed = True
            if current_animal:
                messages.append(
                    f"Collar {collar.codigo} desasignado de {current_animal.nombre}, ahora esta disponible."
                )
        return changed, " ".join(messages)

    # Si el collar ya está asignado al mismo animal y no hay cambios, no hacer nada
    if current_assignment and current_assignment.animal_id == animal_to_assign.id:
        return False, None

    # Si el animal ya tiene otro collar asignado, desasignarlo
    existing_animal_assignment = (
        db.query(AsignacionCollar)
        .filter_by(animal_id=animal_to_assign.id, fecha_fin=None)
        .first()
    )
    if existing_animal_assignment and existing_animal_assignment.collar_id != collar.id:
        previous_collar = db.get(Collar, existing_animal_assignment.collar_id)
        end_active_assignment(existing_animal_assignment, db)
        changed = True
        if previous_collar:
            messages.append(
                f"El collar {previous_collar.codigo} fue desasignado de {animal_to_assign.nombre} y ahora esta disponible."
            )

    # Si el collar estaba asignado a otro animal, desasignarlo
    if current_assignment:
        end_active_assignment(current_assignment, db)
        changed = True
        if current_animal and current_animal.id != animal_to_assign.id:
            messages.append(
                f"Collar {collar.codigo} fue desasignado de {current_animal.nombre}."
            )

    # Crear la nueva asignación
    create_new_assignment_logic(collar.id, animal_to_assign.id, current_user_id, db)
    changed = True
    messages.insert(0, f"Collar {collar.codigo} asignado a {animal_to_assign.nombre}.")

    return changed, " ".join(messages)

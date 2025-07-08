from fastapi import Depends
from datetime import datetime
from backend.app.models import (
    Collar,
    Animal,
    EstadoCollar,
    Usuario,
    AsignacionCollar,
    Collar,
)
from backend.app.login_manager import get_current_user
from sqlalchemy.orm import Session
from backend.app.db import get_db

# --- Variables globales para los estados de collar ---
# Inicializadas como None o diccionarios vacios, se llenaran dentro del contexto de la aplicacion.
_estados_collar_map = None
_estado_disponible_obj = None
_estado_activo_obj = None
_estado_sin_bateria_obj = None
_estado_defectuoso_obj = None


def _load_collar_states(
    db: Session = Depends(get_db),
):
    """Carga los objetos de estado de collar desde la base de datos."""
    global _estados_collar_map, _estado_disponible_obj, _estado_activo_obj, _estado_sin_bateria_obj, _estado_defectuoso_obj

    # Solo cargar si no han sido cargados previamente
    if _estados_collar_map is None:
        try:
            all_states = db.query(EstadoCollar).all()
            _estados_collar_map = {e.nombre.lower(): e for e in all_states}
            _estado_disponible_obj = _estados_collar_map.get("disponible")
            _estado_activo_obj = _estados_collar_map.get("activo")
            _estado_sin_bateria_obj = _estados_collar_map.get("sin bateria")
            _estado_defectuoso_obj = _estados_collar_map.get("defectuoso")

            if not all(
                [
                    _estado_disponible_obj,
                    _estado_activo_obj,
                    _estado_sin_bateria_obj,
                    _estado_defectuoso_obj,
                ]
            ):
                print("WARNING: Faltan estados de collar criticos en la base de datos.")
                # Aqui podrias lanzar una excepcion o registrar un error severo si estos estados son esenciales.
                # Para este caso, continuaremos, pero las funciones que los usen deberan verificar si son None.
        except Exception as e:
            print(
                f"ERROR: No se pudieron cargar los estados de collar al iniciar el Blueprint: {e}"
            )
            # Esto podria indicar un problema con la DB o los modelos al inicio.
            # Asegurate de que tu app se inicie correctamente y que la DB este migrada.


def get_estado_collar_id(nombre_estado):
    """Obtiene el ID de un estado de collar por su nombre."""
    if (
        _estados_collar_map is None
    ):  # Si por alguna razon no se cargo al inicio, intentar cargar ahora
        _load_collar_states()
        if _estados_collar_map is None:  # Si sigue siendo None, algo esta muy mal
            return None  # O lanzar error

    estado = _estados_collar_map.get(nombre_estado.lower())
    return estado.id if estado else None


def get_estado_collar_nombre(id_estado):
    """Obtiene el nombre de un estado de collar por su ID."""
    if _estados_collar_map is None:
        _load_collar_states()
        if _estados_collar_map is None:
            return "desconocido"

    # Buscar en el mapa el objeto de estado por su ID
    for estado_obj in _estados_collar_map.values():
        if estado_obj.id == id_estado:
            return estado_obj.nombre
    return "desconocido"


# --- Funciones Auxiliares para Animales (se mantienen) ---
def get_animal_by_identificacion(
    numero_identificacion,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    if not numero_identificacion:
        return None
    # Asegurate de que Parcela y Campo esten importados para esta consulta
    from backend.app.models import (
        Parcela,
        Campo,
    )  # Importacion local si es necesario para evitar circular imports

    animal = (
        db.query(Animal)
        .filter_by(numero_identificacion=numero_identificacion)
        .join(Animal.parcela)
        .join(Parcela.campo)
        .filter(Campo.usuario_id == current_user.id)
        .first()
    )
    return animal


def _create_new_collar_logic(codigo, db: Session = Depends(get_db)):
    """Crea un nuevo collar con estado 'disponible' y bateria 100%."""
    if not _estado_disponible_obj:
        raise ValueError("Estado 'disponible' no configurado en la base de datos.")

    new_collar = Collar(
        codigo=codigo,
        estado_collar_id=_estado_disponible_obj.id,
        bateria=100.0,
        ultima_actividad=datetime.now(),
    )
    db.add(new_collar)
    db.flush()
    return new_collar


def _end_active_assignment(assignment, db: Session = Depends(get_db)):
    """Finaliza una asignacion activa."""
    if assignment and assignment.fecha_fin is None:
        assignment.fecha_fin = datetime.now()
        db.add(assignment)

        old_collar = Collar.query.get(assignment.collar_id)
        if old_collar and old_collar.estado_collar_id not in [
            _estado_sin_bateria_obj.id,
            _estado_defectuoso_obj.id,
        ]:
            old_collar.estado_collar_id = _estado_disponible_obj.id
            db.add(old_collar)


def _create_new_assignment_logic(
    collar_id, animal_id, usuario_id, db: Session = Depends(get_db)
):
    """Crea una nueva asignacion de collar y pone el collar en estado 'activo'."""
    if not _estado_activo_obj:
        raise ValueError("Estado 'activo' no configurado en la base de datos.")

    new_assignment = AsignacionCollar(
        animal_id=animal_id,
        collar_id=collar_id,
        usuario_id=usuario_id,
        fecha_inicio=datetime.now(),
        fecha_fin=None,
    )
    db.add(new_assignment)

    collar = Collar.query.get(collar_id)
    if collar and collar.estado_collar_id != _estado_activo_obj.id:
        collar.estado_collar_id = _estado_activo_obj.id
        db.add(collar)
    return new_assignment


def _assign_collar(
    collar, animal_to_assign, current_user_id, db: Session = Depends(get_db)
):
    """
    Gestiona la asignacion de un collar a un animal.
    Finaliza asignaciones previas si es necesario.
    """
    # 1. Finalizar asignacion activa del COLLAR (si este collar ya estaba asignado)
    current_collar_assignment = AsignacionCollar.query.filter_by(
        collar_id=collar.id, fecha_fin=None
    ).first()
    _end_active_assignment(current_collar_assignment)

    # 2. Si hay un animal_to_assign, asignarlo
    if animal_to_assign:
        # Finalizar cualquier asignacion activa del ANIMAL (si el animal ya tiene otro collar)
        existing_animal_assignment = AsignacionCollar.query.filter_by(
            animal_id=animal_to_assign.id, fecha_fin=None
        ).first()
        _end_active_assignment(existing_animal_assignment)

        # Crear la nueva asignacion
        _create_new_assignment_logic(collar.id, animal_to_assign.id, current_user_id)
    else:  # Si animal_to_assign es None, el collar queda desasignado y pasa a disponible
        if collar.estado_collar_id not in [
            _estado_sin_bateria_obj.id,
            _estado_defectuoso_obj.id,
        ]:
            collar.estado_collar_id = _estado_disponible_obj.id
            db.add(collar)

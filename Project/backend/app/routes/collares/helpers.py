import re
import csv
from io import StringIO
from typing import List, Dict
from datetime import datetime
from fastapi import HTTPException
from sqlalchemy.orm import Session
from backend.app.models import Collar, AsignacionCollar, EstadoCollar, Animal, Usuario

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
    """Crea un nuevo collar con estado 'disponible' y bateria 100%."""
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
    """Finaliza una asignacion activa."""
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
    """Crea una nueva asignacion de collar y pone el collar en estado 'activo'."""
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
    """Asigna o desasigna un collar de un animal y devuelve detalles de la operacion."""

    # 1. Finalizar asignacion activa del COLLAR (si este collar ya estaba asignado)
    current_collar_assignment = (
        db.query(AsignacionCollar)
        .filter_by(collar_id=collar.id, fecha_fin=None)
        .first()
    )
    unassigned_from = None
    if current_collar_assignment:
        animal_prev = db.get(Animal, current_collar_assignment.animal_id)
        unassigned_from = animal_prev.nombre if animal_prev else None
    end_active_assignment(current_collar_assignment, db)

    assigned_to = None
    replaced_collar = None

    # 2. Si hay un animal_to_assign, asignarlo
    if animal_to_assign:
        # Finalizar cualquier asignacion activa del ANIMAL (si el animal ya tiene otro collar)
        existing_animal_assignment = (
            db.query(AsignacionCollar)
            .filter_by(animal_id=animal_to_assign.id, fecha_fin=None)
            .first()
        )
        if existing_animal_assignment:
            prev_collar = db.get(Collar, existing_animal_assignment.collar_id)
            replaced_collar = prev_collar.codigo if prev_collar else None
        end_active_assignment(existing_animal_assignment, db)

        # Crear la nueva asignacion
        create_new_assignment_logic(collar.id, animal_to_assign.id, current_user_id, db)
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
    Limpia y valida el codigo de collar. Devuelve el codigo limpio y una lista de errores si los hay.
    Reglas:
    - 4 letras en mayuscula, guion, y numero de 5 cifras.
    - Letras se convierten a mayuscula automaticamente.
    """
    errores = []
    raw_codigo = raw_codigo.strip()
    match = re.match(r"^([a-zA-Z]{4})-(\d{1,5})$", raw_codigo)
    if not match:
        errores.append(
            {
                "field": "Codigo",
                "value": raw_codigo,
                "message": "Formato invalido. Debe ser AAAA-00001",
            }
        )
        return raw_codigo, errores

    letras, numero = match.group(1).upper(), match.group(2).zfill(5)
    if len(letras) != 4:
        errores.append(
            {
                "field": "Codigo",
                "value": raw_codigo,
                "message": "El prefijo debe tener exactamente 4 letras mayusculas",
            }
        )

    if int(numero) > 99999:
        errores.append(
            {
                "field": "Codigo",
                "value": raw_codigo,
                "message": "El numero debe estar entre 00000 y 99999",
            }
        )

    return f"{letras}-{numero}", errores


def format_row_errors(row_errors: List[Dict]) -> str:
    """Concatenate error messages for a row into a single string."""
    parts = []
    for err in row_errors:
        value = err.get("value")
        msg = f"{err['field']}: {err['message']}"
        if value is not None:
            msg += f" (Valor: \"{value}\")"
        parts.append(msg)
    return " ".join(parts)


def process_import(content: str, db: Session, current_user: Usuario):
    """Importación de collares desde CSV, devolviendo resumen por fila (errores + acciones)."""
    reader = csv.DictReader(StringIO(content))

    expected_cols = {"codigo", "Codigo", "codigo (Collar)"}
    code_key = next((c for c in (reader.fieldnames or []) if c in expected_cols), None)
    id_key = next(
        (c for c in (reader.fieldnames or []) if c.lower() in ["id", "numero_identificacion", "numero_identificacion (animal)"]),
        None,
    )

    if not code_key or not id_key:
        raise HTTPException(status_code=400, detail="Encabezados CSV inválidos. Se requieren 'Codigo' e 'ID'.")

    summary = {"total_processed": 0, "created": 0, "updated": 0, "errors_count": 0}
    errors, details, row_details = [], [], []
    row_num = 5  # considerando que el encabezado está en fila 5

    for row in reader:
        if not row.get("Codigo") or row["Codigo"].startswith("#"):
            continue
        row_num += 1
        summary["total_processed"] += 1

        codigo_raw = (row.get(code_key) or "").strip()
        codigo, codigo_errors = sanitize_and_validate_collar_code(codigo_raw)
        row_errors = codigo_errors.copy()

        numero_identificacion = (row.get(id_key) or "").strip()
        detail_msg = ""

        if not codigo:
            row_errors.append({"field": "Codigo", "value": codigo_raw, "message": "Codigo requerido"})

        if row_errors:
            summary["errors_count"] += 1
            detail_msg = format_row_errors(row_errors)
            row_details.append((codigo_raw, numero_identificacion, detail_msg))
            errors.append({"row": row_num, "errors": row_errors})
            continue

        try:
            collar = db.query(Collar).filter_by(codigo=codigo).first()
            created_now = False
            if not collar:
                collar = create_new_collar_logic(codigo, db)
                summary["created"] += 1
                created_now = True

            animal_obj = None
            if numero_identificacion:
                animal_obj = db.query(Animal).filter_by(numero_identificacion=numero_identificacion).first()
                if not animal_obj:
                    row_errors.append({
                        "field": "ID",
                        "value": numero_identificacion,
                        "message": "Animal no encontrado"
                    })
                    summary["errors_count"] += 1
                    detail_msg = format_row_errors(row_errors)
                    row_details.append((codigo, numero_identificacion, detail_msg))
                    errors.append({"row": row_num, "errors": row_errors})
                    continue

            current_assignment = db.query(AsignacionCollar).filter_by(collar_id=collar.id, fecha_fin=None).first()
            already_assigned_to_same = (
                current_assignment is not None and
                animal_obj is not None and
                current_assignment.animal_id == animal_obj.id
            )

            if not created_now and already_assigned_to_same:
                row_details.append((codigo, numero_identificacion, ""))
                continue

            info = assign_collar(collar, animal_obj, current_user.id, db)
            db.commit()

            msg = ""
            if created_now:
                if info["assigned_to"]:
                    msg = f"Collar {collar.codigo} creado y asignado a {info['assigned_to']}."
                    if info["replaced_collar"]:
                        msg += f" El collar {info['replaced_collar']} fue desasignado de {info['assigned_to']} y ahora esta disponible."
                else:
                    msg = f"Collar {collar.codigo} creado."
            else:
                if info["assigned_to"]:
                    msg = f"Collar {collar.codigo} asignado a {info['assigned_to']}."
                    if info["replaced_collar"]:
                        msg += f" El collar {info['replaced_collar']} fue desasignado de {info['assigned_to']} y ahora esta disponible."
                    summary["updated"] += 1
                elif info["unassigned_from"]:
                    msg = f"Collar {collar.codigo} desasignado de {info['unassigned_from']}, ahora esta disponible."
                    summary["updated"] += 1

            detail_msg = msg
            if msg:
                details.append(msg)

        except Exception as e:
            db.rollback()
            error_msg = {"field": "general", "message": str(e)}
            row_errors.append(error_msg)
            summary["errors_count"] += 1
            detail_msg = format_row_errors(row_errors)
            errors.append({"row": row_num, "errors": row_errors})

        row_details.append((codigo, numero_identificacion, detail_msg))

    status = "error" if (summary["created"] == 0 and summary["updated"] == 0 and summary["errors_count"] > 0) else "success"
    message = "Importacion completada" if status == "success" else "Importacion completada con errores"

    return {
        "status": status,
        "message": message,
        "summary": summary,
        "errors": errors,
        "details": details,
        "rows": row_details,
    }
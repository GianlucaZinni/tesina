from typing import List, Dict
from datetime import datetime
import re
import csv
from io import StringIO
from fastapi import APIRouter, Depends, HTTPException, Response, Body
from fastapi import UploadFile, File
from sqlalchemy.orm import Session

from backend.app.db import get_db
from backend.app.models import (
    AsignacionCollar,
    Animal,
    EstadoCollar,
)
from backend.app.models.collar import (
    Collar,
    CollarCreate,
    CollarUpdate,
    CollarAssign,
    CollarState,
    CollarBatchDelete,
)
from backend.app.models.usuario import Usuario
from backend.app.login_manager import get_current_user
from backend.app.cache.import_result_cache import store_import_result, get_import_result

from .helpers import (
    get_estado_id,
    get_estado_nombre,
    create_new_collar_logic,
    assign_collar,
    process_import,
)


router = APIRouter(prefix="/api/collares")


@router.get("/states", response_model=List[CollarState])
def list_states(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    return [
        CollarState(id=estado.id, nombre=estado.nombre)
        for estado in db.query(EstadoCollar).all()
    ]


@router.get("/available", response_model=List[Dict])
def list_available(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    assigned = (
        db.query(AsignacionCollar.collar_id)
        .filter(AsignacionCollar.fecha_fin.is_(None))
        .subquery()
    )
    availables = db.query(Collar).filter(
        Collar.estado_collar_id == get_estado_id("disponible", db),
        ~Collar.id.in_(assigned),
    )
    return [
        {
            "id": a.id,
            "codigo": a.codigo,
            "estado": get_estado_nombre(a.estado_collar_id, db),
            "bateria": a.bateria,
            "ultima_actividad": (
                a.ultima_actividad.isoformat() if a.ultima_actividad else None
            ),
        }
        for a in availables
    ]


@router.get("/", response_model=List[Dict])
def list_collares(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    collares = (
        db.query(
            Collar,
            Animal.id.label("animal_id"),
            Animal.nombre.label("animal_nombre"),
            EstadoCollar.nombre.label("estado_nombre"),
        )
        .outerjoin(
            AsignacionCollar,
            (Collar.id == AsignacionCollar.collar_id)
            & (AsignacionCollar.fecha_fin.is_(None)),
        )
        .outerjoin(Animal, AsignacionCollar.animal_id == Animal.id)
        .join(EstadoCollar, Collar.estado_collar_id == EstadoCollar.id)
        .all()
    )

    result = []
    for collar, animal_id, animal_nombre, estado_nombre in collares:
        result.append(
            {
                "id": collar.id,
                "codigo": collar.codigo,
                "estado": estado_nombre,
                "bateria": collar.bateria,
                "ultima_actividad": (
                    collar.ultima_actividad.isoformat()
                    if collar.ultima_actividad
                    else None
                ),
                "animal_id": animal_id,
                "animal_nombre": animal_nombre,
            }
        )
    return result


@router.post("/", response_model=Dict, status_code=201)
def create_collar(
    data: CollarCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):

    codigo = data.codigo
    cantidad = data.cantidad

    if not codigo:
        raise HTTPException(
            status_code=400, detail="El identificador base del collar es obligatorio."
        )

    if not isinstance(cantidad, int) or cantidad <= 0:
        raise HTTPException(
            status_code=400, detail="La cantidad debe ser un numero entero positivo."
        )

    try:
        existing_collars = (
            db.query(Collar).filter(Collar.codigo.like(f"{codigo}-%")).all()
        )
        last_sequence_number = 0
        for collar_existente in existing_collars:
            match = re.search(r"-(\d+)$", collar_existente.codigo)
            if match:
                sequence = int(match.group(1))
                if sequence > last_sequence_number:
                    last_sequence_number = sequence

        start_sequence_from = last_sequence_number + 1
        end_sequence_at = start_sequence_from + cantidad - 1

        for i in range(start_sequence_from, end_sequence_at + 1):
            create_new_collar_logic(f"{codigo}-{i}", db)

        db.commit()
        return {
            "status": "success",
            "message": f"Se han creado {cantidad} collares con identificador base '{codigo}'.",
            "first_code": f"{codigo}-{start_sequence_from}",
            "last_code": f"{codigo}-{end_sequence_at}",
        }
    except Exception as e:
        db.rollback()
        return {
            "status": "error",
            "message": "Error interno del servidor al crear collares: " + str(e),
        }


@router.get("/{collar_id}", response_model=Dict)
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
    return {
        "id": collar.id,
        "codigo": collar.codigo,
        "estado": get_estado_nombre(collar.estado_collar_id, db),
        "bateria": collar.bateria,
        "animal_id": asignacion.animal_id if asignacion else None,
    }


@router.put("/{collar_id}", response_model=Dict)
def update_collar(
    collar_id: int,
    data: CollarUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    collar = db.get(Collar, collar_id)
    if not collar:
        raise HTTPException(status_code=404, detail="Collar no encontrado")

    changed = False

    if data.estado is not None:
        get_estado_nombre(data.estado, db)
        collar.estado_collar_id = data.estado
        changed = True

    if changed or (
        collar.ultima_actividad is None or collar.ultima_actividad < datetime.now()
    ):
        collar.ultima_actividad = datetime.now()
        if not changed:
            changed = True

    if not changed:
        return {
            "status": "info",
            "message": "No se detectaron cambios para actualizar.",
        }

    db.add(collar)
    try:
        db.commit()
        return {"status": "success", "message": "Collar actualizado correctamente."}

    except Exception as e:
        db.rollback()
        return {
            "status": "error",
            "message": "Error interno del servidor al actualizar collar: " + str(e),
        }


@router.delete("/{collar_id}")
def delete_collar(
    collar_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    collar = db.get(Collar, collar_id)
    if not collar:
        raise HTTPException(status_code=404, detail="Collar no encontrado")

    try:
        asignacion = (
            db.query(AsignacionCollar)
            .filter_by(collar_id=collar.id, fecha_fin=None)
            .first()
        )
        if asignacion:
            asignacion.fecha_fin = datetime.utcnow()
            db.add(asignacion)

        db.delete(collar)
        db.commit()
        return {
            "status": "ok",
            "message": "Collar eliminado correctamente. Cualquier asignacion activa ha sido desvinculada.",
        }
    except Exception as e:
        db.rollback()
        HTTPException(
            status_code=500,
            detail="Error interno del servidor al eliminar collar: " + str(e),
        )
        return {
            "status": "error",
            "message": "Error interno del servidor al eliminar collar: " + str(e),
        }


@router.delete("/", response_model=Dict)
def batch_delete_collars(
    request: CollarBatchDelete,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    deleted = 0
    try:
        for collar_id in request.ids:
            collar = db.get(Collar, collar_id)
            if not collar:
                continue
            asignacion = (
                db.query(AsignacionCollar)
                .filter_by(collar_id=collar.id, fecha_fin=None)
                .first()
            )
            if asignacion:
                asignacion.fecha_fin = datetime.utcnow()
                db.add(asignacion)
            db.delete(collar)
            deleted += 1
        db.commit()
        return {
            "status": "ok",
            "message": f"Se han eliminado los {deleted} animales seleccionados.",
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Error interno del servidor al eliminar collares: " + str(e),
        )


@router.post("/{collar_id}/assign")
def handle_assign_collar(
    collar_id: int,
    data: CollarAssign,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    collar = db.get(Collar, collar_id)
    if not collar:
        raise HTTPException(status_code=404, detail="Collar no encontrado")

    try:
        animal_obj = None
        if data.animal_id is not None:
            animal_obj = db.get(Animal, data.animal_id)
            if not animal_obj:
                raise HTTPException(status_code=404, detail="Animal no encontrado")
            if (
                animal_obj.parcela
                and animal_obj.parcela.campo.usuario_id != current_user.id
            ):
                raise HTTPException(
                    status_code=403, detail="No autorizado para asignar este animal"
                )

        info = assign_collar(collar, animal_obj, current_user.id, db)
        db.commit()

        message = None
        if info["assigned_to"]:
            message = f"Collar {collar.codigo} asignado a {info['assigned_to']}."
            if info["replaced_collar"]:
                message += f" El collar {info['replaced_collar']} fue desasignado de {info['assigned_to']} y ahora esta disponible."
        elif info["unassigned_from"]:
            message = f"Collar {collar.codigo} fue desasignado de {info['unassigned_from']} y ahora esta disponible."
        else:
            message = f"Collar {collar.codigo} desasignado correctamente."

        return {"status": "success", "message": message}

    except Exception as e:
        db.rollback()
        return {"status": "error", "message": f"Error interno del servidor: {str(e)}"}


@router.post("/import")
def import_collares(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    content = file.file.read().decode("utf-8-sig")
    result = process_import(content, db, current_user)
    import_id = store_import_result(result)
    response = result.copy()
    response.pop("rows", None)
    response["import_id"] = import_id
    return response


@router.get("/import/file/{import_id}")
def download_import_detail(import_id: str):
    result = get_import_result(import_id)
    if not result or "rows" not in result:
        raise HTTPException(status_code=404, detail="Resultado de importación no encontrado")

    output = StringIO()
    writer = csv.writer(output)
    writer.writerow(["Codigo", "ID", "# Detalle"])
    for codigo, ident, detalle in result["rows"]:
        writer.writerow([codigo, ident, detalle])

    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=collares_import_result.csv"},
    )

@router.post("/export")
def export_collares(
    payload: Dict,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """Exporta collares con instrucciones en la columna 4, alineadas con los primeros registros."""
    export_type = payload.get("type", "all")
    ids = payload.get("ids") or []
    global_filter = payload.get("globalFilter")

    query = (
        db.query(Collar.codigo, Animal.numero_identificacion)
        .outerjoin(
            AsignacionCollar,
            (Collar.id == AsignacionCollar.collar_id)
            & (AsignacionCollar.fecha_fin.is_(None)),
        )
        .outerjoin(Animal, AsignacionCollar.animal_id == Animal.id)
    )

    if export_type in {"selected", "page"} and ids:
        query = query.filter(Collar.id.in_(ids))

    if global_filter:
        like = f"%{global_filter}%"
        query = query.filter(
            (Collar.codigo.ilike(like)) | (Animal.numero_identificacion.ilike(like))
        )

    rows = query.all()

    output = StringIO()
    writer = csv.writer(output)

    # Fila de encabezado
    writer.writerow(["Codigo", "ID", "# Detalle", "# Instrucciones:"])

    # Lista de instrucciones
    instrucciones = [
        "1. El codigo debe tener min/max 4 letras, guion: '-', y un numero de min/max 5 cifras.",
        "2. Si el codigo no contiene los requisitos requeridos, sera registrado como error.",
        "3. Si se intenta asignar un collar a un animal inexistente, sera registrado como error.",
        "4. El detalle se mostrara en el archivo descargable, luego de realizar una importacion.",
    ]

    # Escribir datos y emparejar instrucciones por fila
    for i, (codigo, ident) in enumerate(rows):
        instruccion = instrucciones[i] if i < len(instrucciones) else ""
        writer.writerow([codigo, ident or "", "", instruccion])

    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=collares.csv"},
    )


@router.get("/export/template")
def export_template(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """Devuelve una plantilla CSV con instrucciones visibles en la columna 4."""
    output = StringIO()
    writer = csv.writer(output)

    # Encabezado + instrucciones en columna 4
    writer.writerow(["Codigo", "ID", "# Detalle", "# Instrucciones:"])
    writer.writerow(
        [
            "AFGH-00001",
            "",
            "",
            "1. El codigo debe tener min/max 4 letras, guion: '-', y un numero de min/max 5 cifras.",
        ]
    )
    writer.writerow(
        [
            "HADS-00001",
            "",
            "",
            "2. Si el codigo no contiene los requisitos requeridos, sera registrado como error.",
        ]
    )
    writer.writerow(
        [
            "LTER-00001",
            "",
            "",
            "3. Si se intenta asignar un collar a un animal inexistente, sera registrado como error.",
        ]
    )
    writer.writerow(
        [
            "AFGH-00002",
            "",
            "",
            "4. El detalle se mostrara en el archivo descargable, luego de realizar una importacion.",
        ]
    )
    writer.writerow(["HADS-00002"])

    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=collares_template.csv"},
    )

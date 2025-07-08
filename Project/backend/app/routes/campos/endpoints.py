from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.app.db import get_db
from backend.app.login_manager import get_current_user
from backend.app.models.campo import Campo, CampoCreate, CampoUpdate

router = APIRouter(prefix="/api/campos")

# --------------------------
# . Crear campo
# --------------------------
@router.post("/create")
def api_create_campo(
    data: CampoCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    if (
        not data.nombre
        or not data.descripcion
        or data.lat is None
        or data.lon is None
    ):
        raise HTTPException(status_code=400, detail="Faltan datos obligatorios")

    # Si no existen campos previos, este será el preferido
    campos_existentes = db.query(Campo).filter_by(usuario_id=current_user.id).count()
    nuevo = Campo(
        nombre=data.nombre,
        descripcion=data.descripcion,
        lat=data.lat,
        lon=data.lon,
        usuario_id=current_user.id,
        is_preferred=(campos_existentes == 0),
    )
    db.add(nuevo)
    db.commit()
    return {"status": "ok", "message": "Campo creado correctamente"}

# --------------------------
# . Actualizar campo
# --------------------------
@router.post("/{campo_id}/update")
def api_update_campo(
    campo_id: int,
    data: CampoUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    campo = db.get(Campo, campo_id)
    if not campo:
        raise HTTPException(status_code=404, detail="Campo no encontrado")
    if campo.usuario_id != current_user.id:
        raise HTTPException(status_code=403, detail="No autorizado")
    
    campo.nombre = data.nombre if data.nombre else campo.nombre
    campo.descripcion = data.descripcion if data.descripcion else campo.descripcion
    campo.lat = float(data.lat) if data.lat else campo.lat
    campo.lon = float(data.lon) if data.lon else campo.lon

    db.commit()
    return {"status": "ok", "message": "Campo actualizado correctamente"}

# --------------------------
# . Eliminar campo
# --------------------------
@router.delete("/{campo_id}/delete")
def api_delete_campo(
    campo_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    campo = db.get(Campo, campo_id)
    if not campo:
        raise HTTPException(status_code=404, detail="Campo no encontrado")
    
    if campo.usuario_id != current_user.id:
        raise HTTPException(status_code=403, detail="No autorizado")

    # Prevent deleting a field that still has parcels assigned
    if campo.parcelas:
        raise HTTPException(
            status_code=400,
            detail="No se puede eliminar el campo porque tiene parcelas asociadas",
        )

    db.delete(campo)
    db.commit()

    return {"status": "ok", "message": "Campo eliminado correctamente"}

from typing import Optional
import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.app.db import get_db
from backend.app.login_manager import get_current_user
from backend.app.models import Campo, Parcela


router = APIRouter(prefix="/map/api")


@router.get("/parcelas")
def api_data_map(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    campos_usuario = db.query(Campo).filter_by(usuario_id=current_user.id).all()

    campos_data = {
        c.id: {
            "lat": c.lat,
            "lon": c.lon,
            "nombre": c.nombre,
            "descripcion": c.descripcion,
            "is_preferred": c.is_preferred  # <-- lo incluimos directamente en el dict
        }
        for c in campos_usuario if c.lat and c.lon
    }

    parcelas_data = {}
    for parcela in Parcela.query.filter(Parcela.campo_id.in_([c.id for c in campos_usuario])).all():
        try:
            geojson = json.loads(parcela.perimetro_geojson)
            geojson["id"] = parcela.id
            geojson["nombre"] = parcela.nombre
            geojson["descripcion"] = parcela.descripcion
            geojson["area"] = parcela.area

            campo_id = parcela.campo_id
            parcelas_data.setdefault(campo_id, []).append(geojson)
        except Exception:
            continue

    # Buscar campo preferido explícitamente
    campo_preferido = next((c for c in campos_usuario if c.is_preferred), None)

    if campo_preferido:
        center_lat = campo_preferido.lat
        center_lon = campo_preferido.lon
        campo_preferido_id = campo_preferido.id
    elif campos_usuario:
        center_lat = campos_usuario[0].lat
        center_lon = campos_usuario[0].lon
        campo_preferido_id = campos_usuario[0].id
    else:
        center_lat = -38.0
        center_lon = -63.0
        campo_preferido_id = None

    return {
        "campos": campos_data,
        "parcelas": parcelas_data,
        "center": {"lat": center_lat, "lon": center_lon},
        "campo_preferido_id": campo_preferido_id
    }


# CAMPOS CRUD

@router.post("/campos/create")
def api_create_campo(
    data: dict,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    nombre = data.get("nombre")
    descripcion = data.get("descripcion")
    lat = data.get("lat")
    lon = data.get("lon")

    if not nombre or not descripcion or not lat or not lon:
        raise HTTPException(status_code=400, detail="Faltan datos obligatorios")

    # Si no existen campos previos, este será el preferido
    campos_existentes = db.query(Campo).filter_by(usuario_id=current_user.id).count()
    nuevo = Campo(
        nombre=nombre,
        descripcion=descripcion,
        lat=float(lat),
        lon=float(lon),
        usuario_id=current_user.id,
        is_preferred=(campos_existentes == 0)
    )
    db.add(nuevo)
    db.commit()
    return {"status": "ok", "message": "Campo creado correctamente"}

@router.post("/campos/{campo_id}/update")
def api_update_campo(
    campo_id: int,
    data: dict,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    campo = db.get(Campo, campo_id)
    if not campo:
        raise HTTPException(status_code=404, detail="Campo no encontrado")
    if campo.usuario_id != current_user.id:
        raise HTTPException(status_code=403, detail="No autorizado")
    campo.nombre = data.get("nombre", campo.nombre)
    campo.descripcion = data.get("descripcion", campo.descripcion)
    campo.lat = float(data.get("lat", campo.lat))
    campo.lon = float(data.get("lon", campo.lon))

    db.commit()
    return {"status": "ok", "message": "Campo actualizado correctamente"}

@router.delete("/campos/{campo_id}/delete")
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

    db.delete(campo)
    db.commit()

    return {"status": "ok", "message": "Campo eliminado correctamente"}


# PARCELAS CRUD

@router.post('/parcelas/create')
def api_create_parcela(
    data: dict,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    campo_id = data.get("campo_id")
    nombre = data.get("nombre")
    descripcion = data.get("descripcion")
    area = data.get("area")
    perimetro_geojson = data.get("perimetro_geojson")

    if not campo_id or not nombre or not perimetro_geojson:
        raise HTTPException(status_code=400, detail="Faltan datos obligatorios")

    campo = db.get(Campo, campo_id)
    if not campo or campo.usuario_id != current_user.id:
        raise HTTPException(status_code=403, detail="Campo no válido o no autorizado")

    nueva = Parcela(
        nombre=nombre,
        descripcion=descripcion,
        perimetro_geojson=json.dumps(perimetro_geojson),
        area=area,
        campo_id=campo_id
    )
    db.add(nueva)
    db.commit()

    return {"status": "ok", "message": "Parcela creada correctamente"}

@router.post('/parcelas/{parcela_id}/update')
def api_update_parcela(
    parcela_id: int,
    data: dict,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    parcela = db.get(Parcela, parcela_id)
    if not parcela:
        raise HTTPException(status_code=404, detail="Parcela no encontrada")
    if parcela.campo.usuario_id != current_user.id:
        raise HTTPException(status_code=403, detail="No autorizado")
    nuevo_geojson = data.get("geojson")
    nuevo_nombre = data.get("nombre")
    nueva_descripcion = data.get("descripcion")
    nueva_area = data.get("area")

    if not nuevo_geojson:
        raise HTTPException(status_code=400, detail="GeoJSON faltante")

    parcela.perimetro_geojson = json.dumps(nuevo_geojson)
    parcela.area = nueva_area

    if nuevo_nombre:
        parcela.nombre = nuevo_nombre

    if nueva_descripcion:
        parcela.descripcion = nueva_descripcion

    db.commit()
    return {"status": "ok", "message": "Parcela actualizada correctamente"}

@router.delete("/parcelas/{parcela_id}/delete")
def api_delete_parcela(
    parcela_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    parcela = db.get(Parcela, parcela_id)
    if not parcela:
        raise HTTPException(status_code=404, detail="Parcela no encontrada")

    if parcela.campo.usuario_id != current_user.id:
        raise HTTPException(status_code=403, detail="No autorizado")

    db.delete(parcela)
    db.commit()

    return {"status": "ok", "message": "Parcela eliminada correctamente"}


__all__ = ["router"]
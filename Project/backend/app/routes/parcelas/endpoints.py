from typing import List, Optional
import json

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.app.db import get_db
from backend.app.login_manager import get_current_user
from backend.app.models import (
    Campo,
    Parcela,
    Animal,
    AsignacionCollar,
    Tipo,
    Raza,
    Sexo,
)
from backend.app.models.usuario import Usuario


router = APIRouter(prefix="/api/parcelas")


class ParcelaCreate(BaseModel):
    campo_id: int
    nombre: str
    descripcion: Optional[str] = None
    area: Optional[float] = None
    perimetro_geojson: dict


class ParcelaUpdate(BaseModel):
    geojson: dict
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    area: Optional[float] = None

# --------------------------
# . Parcelas y campos (para mapa)
# --------------------------
@router.get("/init")
def api_parcela_init(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
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
        "campo_preferido_id": campo_preferido_id,
    }

# --------------------------
# . Animales por parcela
# --------------------------
@router.get("/animales/resumen")
def api_parcela_animals(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    # 1. Totales de animales y collares activos por parcela con nombre
    resumen_base = (
        db.query(
            Parcela.id,
            Parcela.nombre,
            func.count(Animal.id).label("total_animales"),
            func.count(AsignacionCollar.collar_id).label("total_collares"),
        )
        .outerjoin(Animal, Animal.parcela_id == Parcela.id)
        .outerjoin(
            AsignacionCollar,
            (AsignacionCollar.animal_id == Animal.id)
            & (AsignacionCollar.fecha_fin == None),
        )
        .group_by(Parcela.id, Parcela.nombre)
        .all()
    )

    # 2. Datos detallados por tipo, sexo y raza
    detalles = db.query(
        Animal.parcela_id,
        Tipo.nombre.label("tipo_nombre"),
        Sexo.nombre.label("sexo_nombre"),
        Raza.nombre.label("raza_nombre"),
        func.count(Animal.id).label("cantidad")
    ).join(Raza, Animal.raza_id == Raza.id
    ).join(Tipo, Raza.tipo_id == Tipo.id
    ).join(Sexo, Animal.sexo_id == Sexo.id
    ).group_by(Animal.parcela_id, Tipo.nombre, Sexo.nombre, Raza.nombre).all()

    # 3. Armar estructura combinada
    resumen_final = {}

    for parcela_id, nombre, total_animales, total_collares in resumen_base:
        resumen_final[parcela_id] = {
            "parcela_id": parcela_id,
            "nombre": nombre,
            "total_animales": total_animales,
            "total_collares": total_collares,
            "tipos": {}
        }

    for parcela_id, tipo, sexo, raza, cantidad in detalles:
        if parcela_id not in resumen_final:
            resumen_final[parcela_id] = {
                "parcela_id": parcela_id,
                "nombre": None,
                "total_animales": 0,
                "total_collares": 0,
                "tipos": {}
            }

        tipos = resumen_final[parcela_id]["tipos"]

        if tipo not in tipos:
            tipos[tipo] = {
                "cantidad": 0,
                "por_sexo": {},
                "por_raza": {}
            }

        tipos[tipo]["cantidad"] += cantidad
        tipos[tipo]["por_sexo"][sexo] = tipos[tipo]["por_sexo"].get(sexo, 0) + cantidad
        tipos[tipo]["por_raza"][raza] = tipos[tipo]["por_raza"].get(raza, 0) + cantidad

    return list(resumen_final.values())

# --------------------------
# . Crear parcela
# --------------------------
@router.post("/create")
def api_create_parcela(
    data: ParcelaCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    if not data.campo_id or not data.nombre or not data.perimetro_geojson:
        raise HTTPException(status_code=400, detail="Faltan datos obligatorios")

    campo = db.get(Campo, data.campo_id)
    if not campo or campo.usuario_id != current_user.id:
        raise HTTPException(status_code=403, detail="Campo no válido o no autorizado")

    nueva = Parcela(
        nombre=data.nombre,
        descripcion=data.descripcion,
        perimetro_geojson=json.dumps(data.perimetro_geojson),
        area=data.area,
        campo_id=data.campo_id,
    )
    db.add(nueva)
    db.commit()

    return {"status": "ok", "message": "Parcela creada correctamente"}

# --------------------------
# . Editar parcela
# --------------------------
@router.post("/{parcela_id}/update")
def api_update_parcela(
    parcela_id: int,
    data: ParcelaUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    parcela = db.get(Parcela, parcela_id)
    if not parcela:
        raise HTTPException(status_code=404, detail="Parcela no encontrada")
    if parcela.campo.usuario_id != current_user.id:
        raise HTTPException(status_code=403, detail="No autorizado")

    if not data.geojson:
        raise HTTPException(status_code=400, detail="GeoJSON faltante")

    parcela.perimetro_geojson = json.dumps(data.geojson)
    parcela.area = data.area

    if data.nombre:
        parcela.nombre = data.nombre

    if data.descripcion:
        parcela.descripcion = data.descripcion

    db.commit()
    return {"status": "ok", "message": "Parcela actualizada correctamente"}

# --------------------------
# . Eliminar parcela
# --------------------------
@router.delete("/{parcela_id}/delete")
def api_delete_parcela(
    parcela_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    parcela = db.get(Parcela, parcela_id)
    if not parcela:
        raise HTTPException(status_code=404, detail="Parcela no encontrada")

    if parcela.campo.usuario_id != current_user.id:
        raise HTTPException(status_code=403, detail="No autorizado")

    db.delete(parcela)
    db.commit()

    return {"status": "ok", "message": "Parcela eliminada correctamente"}
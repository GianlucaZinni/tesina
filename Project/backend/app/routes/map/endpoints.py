import json

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.db import get_db
from backend.app.login_manager import get_current_user
from backend.app.models import Campo, Parcela, Usuario


router = APIRouter(prefix="/api/map")


# --------------------------
# . Parcelas y campos (para mapa)
# --------------------------
@router.get("/")
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
            "is_preferred": c.is_preferred,
        }
        for c in campos_usuario
        if c.lat and c.lon
    }

    parcelas_data = {}
    for parcela in (
        db.query(Parcela)
        .filter(Parcela.campo_id.in_([c.id for c in campos_usuario]))
        .all()
    ):
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

    # Buscar campo preferido explicitamente
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

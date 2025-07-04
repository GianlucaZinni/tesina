from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy import desc
from sqlalchemy.orm import Session, joinedload

from backend.app.db import get_db
from backend.app.models import (
    Ubicacion,
    Temperatura,
    Acelerometro,
    NodoAutorizado,
    Animal,
    AsignacionCollar,
    UbicacionActual,
)


router = APIRouter(prefix="/api")


class AcelerometroData(BaseModel):
    x: float
    y: float
    z: float


class DatosIn(BaseModel):
    timestamp: str
    lat: Optional[float] = None
    lon: Optional[float] = None
    temperatura: Optional[float] = None
    temperatura_ambiente: Optional[float] = None
    acelerometro: Optional[AcelerometroData] = None


@router.post("/datos")
def recibir_datos(
    data: DatosIn,
    request: Request,
    db: Session = Depends(get_db),
):
    """Recibir y almacenar datos enviados desde los nodos."""
    client_id = request.headers.get("X-Client-ID")
    if not client_id:
        raise HTTPException(status_code=401, detail="Falta el encabezado 'X-Client-ID'")

    nodo = db.query(NodoAutorizado).filter_by(client_id=client_id, esta_autorizado=True).first()
    if not nodo:
        raise HTTPException(status_code=403, detail="Nodo no autorizado")

    collar = nodo.collar
    if not collar:
        raise HTTPException(status_code=404, detail="Collar no asociado al nodo")

    try:
        timestamp = datetime.strptime(data.timestamp, "%Y-%m-%dT%H:%M:%S")

        if data.lat is not None and data.lon is not None:
            ubicacion = Ubicacion(
                timestamp=timestamp,
                lat=data.lat,
                lon=data.lon,
                collar_id=collar.id,
            )
            db.add(ubicacion)

            asignacion = (
                db.query(AsignacionCollar)
                .filter_by(collar_id=collar.id, fecha_fin=None)
                .first()
            )
            if asignacion and asignacion.animal_id:
                actual = (
                    db.query(UbicacionActual)
                    .filter_by(animal_id=asignacion.animal_id)
                    .first()
                )
                if actual:
                    actual.lat = data.lat
                    actual.lon = data.lon
                    actual.timestamp = timestamp
                else:
                    db.add(
                        UbicacionActual(
                            animal_id=asignacion.animal_id,
                            lat=data.lat,
                            lon=data.lon,
                            timestamp=timestamp,
                        )
                    )

                if data.temperatura is not None:
                    db.add(
                        Temperatura(
                            timestamp=timestamp,
                            corporal=data.temperatura,
                            ambiente=data.temperatura_ambiente,
                            collar_id=collar.id,
                        )
                    )

        if data.acelerometro:
            db.add(
                Acelerometro(
                    timestamp=timestamp,
                    x=data.acelerometro.x,
                    y=data.acelerometro.y,
                    z=data.acelerometro.z,
                    collar_id=collar.id,
                )
            )

        db.commit()
        return {"status": "ok", "message": "Datos almacenados correctamente"}

    except Exception as exc:  # pragma: no cover - just in case
        db.rollback()
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/debug/nodo/{client_id}")
def debug_nodo(client_id: str, db: Session = Depends(get_db)):
    nodo = db.query(NodoAutorizado).filter_by(client_id=client_id).first()
    if not nodo:
        return {"estado": "error", "mensaje": "Nodo no encontrado"}
    return {
        "estado": "ok",
        "client_id": nodo.client_id,
        "esta_autorizado": nodo.esta_autorizado,
        "collar_id": nodo.collar_id,
        "collar_codigo": nodo.collar.codigo if nodo.collar else None,
    }


@router.get("/collares/estado")
def collares_estado(db: Session = Depends(get_db)):
    asignaciones = (
        db.query(AsignacionCollar)
        .options(
            joinedload(AsignacionCollar.animal),
            joinedload(AsignacionCollar.usuario_id),
            joinedload(AsignacionCollar.collar),
        )
        .filter(AsignacionCollar.fecha_fin.is_(None))
        .all()
    )

    resultado = []
    for asignacion in asignaciones:
        animal = asignacion.animal
        collar = asignacion.collar
        if not animal or not collar:
            continue

        ubicacion = (
            db.query(Ubicacion)
            .filter_by(collar_id=collar.id)
            .order_by(desc(Ubicacion.timestamp))
            .first()
        )
        temperatura = (
            db.query(Temperatura)
            .filter_by(collar_id=collar.id)
            .order_by(desc(Temperatura.timestamp))
            .first()
        )
        acelerometro = (
            db.query(Acelerometro)
            .filter_by(collar_id=collar.id)
            .order_by(desc(Acelerometro.timestamp))
            .first()
        )

        resultado.append(
            {
                "animal_id": animal.id,
                "nombre": animal.nombre,
                "collar_id": collar.id,
                "collar_codigo": collar.codigo,
                "temperatura": temperatura.corporal if temperatura else None,
                "ubicacion": {
                    "lat": ubicacion.lat,
                    "lon": ubicacion.lon,
                }
                if ubicacion
                else None,
                "acelerometro": {
                    "x": acelerometro.x,
                    "y": acelerometro.y,
                    "z": acelerometro.z,
                }
                if acelerometro
                else None,
                "timestamp": ubicacion.timestamp.strftime("%Y-%m-%d %H:%M:%S")
                if ubicacion
                else None,
            }
        )

    return resultado


__all__ = ["router"]
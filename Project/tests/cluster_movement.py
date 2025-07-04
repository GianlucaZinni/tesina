import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import json
import random
import time
from datetime import datetime
from shapely.geometry import shape, Point
from sqlalchemy import func
from sqlalchemy.orm import joinedload, Session

from backend.app import create_app
from backend.app.db import SessionLocal
from backend.app.models import (
    Animal,
    Ubicacion,
    UbicacionActual,
    AsignacionCollar,
)


def get_random_point_within(polygon):
    minx, miny, maxx, maxy = polygon.bounds
    while True:
        p = Point(random.uniform(minx, maxx), random.uniform(miny, maxy))
        if polygon.contains(p):
            return p


def initialize_positions(db: Session):
    animales = db.query(Animal).options(joinedload(Animal.parcela)).all()
    for animal in animales:
        if not animal.parcela or not animal.parcela.perimetro_geojson:
            continue

        try:
            geojson = json.loads(animal.parcela.perimetro_geojson)
            polygon = shape(geojson["geometry"])
        except Exception as e:
            print(f"Error leyendo GeoJSON para Parcela ID {animal.parcela.id}: {e}")
            continue

        punto = get_random_point_within(polygon)

        collar_id = db.query(AsignacionCollar.collar_id).filter(
            AsignacionCollar.animal_id == animal.id,
            AsignacionCollar.fecha_fin.is_(None)
        ).scalar()

        if not collar_id:
            continue

        ubicacion = Ubicacion(
            timestamp=datetime.utcnow(),
            lat=punto.y,
            lon=punto.x,
            collar_id=collar_id
        )
        db.add(ubicacion)
    db.commit()
    print("Inicialización completa.")


def update_positions(db: Session):
    # Subconsulta que devuelve (collar_id, timestamp) más reciente
    subq = (
        db.query(
            Ubicacion.collar_id,
            func.max(Ubicacion.timestamp).label("max_ts")
        )
        .group_by(Ubicacion.collar_id)
        .subquery()
    )

    # Join entre Ubicacion y subconsulta para obtener las últimas ubicaciones por collar
    posiciones = (
        db.query(Ubicacion)
        .join(subq, (Ubicacion.collar_id == subq.c.collar_id) & (Ubicacion.timestamp == subq.c.max_ts))
        .all()
    )

    for pos in posiciones:
        nuevo_punto = Point(
            pos.lon + random.uniform(-0.0002, 0.0002),
            pos.lat + random.uniform(-0.0002, 0.0002)
        )

        nueva_ubicacion = Ubicacion(
            timestamp=datetime.utcnow(),
            lat=nuevo_punto.y,
            lon=nuevo_punto.x,
            collar_id=pos.collar_id
        )
        db.add(nueva_ubicacion)

    db.commit()

def update_ubicacion_actual(db: Session):
    subquery = db.query(
        Ubicacion.collar_id,
        func.max(Ubicacion.timestamp).label("max_ts")
    ).group_by(Ubicacion.collar_id).subquery()

    ubicaciones = db.query(Ubicacion).join(
        subquery,
        (Ubicacion.collar_id == subquery.c.collar_id) &
        (Ubicacion.timestamp == subquery.c.max_ts)
    ).all()

    for ubic in ubicaciones:
        asignacion = db.query(AsignacionCollar).filter_by(
            collar_id=ubic.collar_id,
            fecha_fin=None
        ).first()
        if not asignacion:
            continue

        ubic_actual = db.query(UbicacionActual).filter_by(
            animal_id=asignacion.animal_id
        ).first()

        if not ubic_actual:
            ubic_actual = UbicacionActual(animal_id=asignacion.animal_id)

        ubic_actual.timestamp = ubic.timestamp
        ubic_actual.lat = ubic.lat
        ubic_actual.lon = ubic.lon
        db.merge(ubic_actual)
    db.commit()


def run_simulation():
    with SessionLocal() as db:
        print("Inicializando posiciones...")
        initialize_positions(db)
        print("Comenzando simulación...")
        while True:
            update_positions(db)
            update_ubicacion_actual(db)
            print(f"[{datetime.now()}] Posiciones actualizadas.")
            time.sleep(10)


if __name__ == "__main__":
    create_app()
    run_simulation()

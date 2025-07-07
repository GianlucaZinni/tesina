import json

from shapely.geometry import shape, Point
import re

from sqlalchemy.orm import Session

from backend.app.models import Animal

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def is_animal_outside(animal: Animal, lon: float, lat: float) -> bool:
    try:
        if not animal.parcela or not animal.parcela.perimetro_geojson:
            return False
        poly = shape(json.loads(animal.parcela.perimetro_geojson)["geometry"])
        point = Point(lon, lat)
        return not poly.contains(point)
    except Exception:
        return False


def generate_identifier(acronimo: str, db: Session) -> str:
    """Return the next available identifier for an acronym."""
    if not re.fullmatch(r"[A-Z]{4}", acronimo):
        raise ValueError("Acr\xc3\xb3nimo inv\xc3\xa1lido")

    existing = (
        db.query(Animal.numero_identificacion)
        .filter(Animal.numero_identificacion.like(f"{acronimo}-%"))
        .all()
    )
    used = set()
    for (num,) in existing:
        match = re.match(rf"{acronimo}-(\d+)$", num or "")
        if match:
            used.add(int(match.group(1)))

    counter = 1
    while counter in used:
        counter += 1
    return f"{acronimo}-{counter:04d}"
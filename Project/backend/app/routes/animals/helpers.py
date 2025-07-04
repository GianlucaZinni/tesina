import json

from shapely.geometry import shape, Point

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

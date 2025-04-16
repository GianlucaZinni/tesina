from Project import db
from Project.models import Campo, Parcela, Collar, Animal, Caracteristicas
from datetime import datetime
import random
import json

def populate_static_data():
    if Campo.query.count() > 0:
        return

    # Crear campos
    campo1 = Campo(nombre="Campo Potolo", descripcion="Zona experimental", lat=-35.5029965905756, lon=-60.3481471538544, is_preferred = True, usuario_id=1)
    campo2 = Campo(nombre="Campo Tralalero", descripcion="Producción intensiva", lat=-35.6167188251521, lon=-59.9720424413681, usuario_id=1)
    db.session.add_all([campo1, campo2])
    db.session.commit()

    # Crear parcelas
    parcela1 = Parcela(nombre="Lote 1", descripcion="Lote A", perimetro_geojson=json.dumps({"type":"Feature","properties":{},"geometry":{"type":"Polygon","coordinates":[[[-60.347836,-35.498322],[-60.340798,-35.503877],[-60.345862,-35.507895],[-60.349681,-35.504855],[-60.347579,-35.503248],[-60.348651,-35.50241],[-60.349424,-35.503108],[-60.348866,-35.503598],[-60.350196,-35.504541],[-60.352643,-35.502619],[-60.347836,-35.498322]]]}}), campo_id=campo1.id)
    parcela2 = Parcela(nombre="Lote 2", descripcion="Lote B", perimetro_geojson=json.dumps({"type":"Feature","properties":{},"geometry":{"type":"Polygon","coordinates":[[[-60.357513,-35.496551],[-60.359402,-35.498158],[-60.357192,-35.4998],[-60.356719,-35.499363],[-60.356462,-35.499573],[-60.356998,-35.500062],[-60.356333,-35.500534],[-60.354359,-35.498891],[-60.355132,-35.498402],[-60.356033,-35.499241],[-60.356333,-35.499014],[-60.355389,-35.49821],[-60.357513,-35.496551]]]}}), campo_id=campo1.id)
    parcela3 = Parcela(nombre="Lote 3", descripcion="Lote C", perimetro_geojson=json.dumps({"type":"Feature","properties":{},"geometry":{"type":"Polygon","coordinates":[[[-59.970331,-35.617061],[-59.970953,-35.617076],[-59.971147,-35.617765],[-59.969516,-35.619566],[-59.965589,-35.619287],[-59.962564,-35.622618],[-59.956942,-35.617619],[-59.970331,-35.617061]]]}}), campo_id=campo2.id)
    db.session.add_all([parcela1, parcela2, parcela3])
    db.session.commit()

    # Crear collares
    collares = []
    for i in range(1, 12):
        collar = Collar(
            codigo=f"COLLAR-{i:03d}",
            fecha_asignacion=datetime.utcnow(),
            bateria=random.uniform(50, 100),
            estado="activo"
        )
        collares.append(collar)
        db.session.add(collar)
    db.session.commit()

    # Crear animales
    nombres = ["Lola", "Bruno", "Camila", "Tito", "Nina", "Roberto", "Tincho", "Jorge", "Martelo", "Ramón", "Cascote"]
    for i, nombre in enumerate(nombres):
        caracteristicas = Caracteristicas(
            indice_corporal=random.uniform(0.8, 1.2),
            perfil=random.choice(["recto", "cóncavo", "convexo"]),
            pelaje=random.choice(["negro", "blanco", "barroso"]),
            cuernos=random.choice([True, False]),
            bcs=random.randint(2, 4),
            comportamiento=random.choice(["dócil", "nervioso"])
        )
        db.session.add(caracteristicas)
        db.session.commit()

        animal = Animal(
            nombre=nombre,
            numero_identificacion=f"ID-{i+1:04d}",
            raza=random.choice(["Angus", "Hereford", "Braford"]),
            sexo=random.choice(["Macho", "Hembra"]),
            peso=round(random.uniform(350, 550), 2),
            altura_cruz=round(random.uniform(120, 150), 2),
            longitud_tronco=round(random.uniform(110, 140), 2),
            perimetro_toracico=round(random.uniform(150, 180), 2),
            ancho_grupa=round(random.uniform(40, 60), 2),
            longitud_grupa=round(random.uniform(50, 70), 2),
            fecha_nacimiento=datetime(2020, random.randint(1, 12), random.randint(1, 28)),
            estado_reproductivo=random.choice(["Preñada", "Vacía", "Activo"]),
            numero_partos=random.randint(0, 4),
            intervalo_partos=random.randint(300, 500),
            fertilidad=round(random.uniform(75, 95), 2),
            ubicacion_sensor="cuello",
            parcela_id=random.choice([parcela1.id, parcela2.id, parcela3.id]),
            caracteristicas_id=caracteristicas.id
        )
        db.session.add(animal)
        db.session.commit()

        collares[i].animal_id = animal.id
        db.session.commit()

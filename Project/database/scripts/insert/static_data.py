from backend.app.db import SessionLocal
from backend.app.models import (
    Campo,
    Parcela,
    EstadoCollar,
    Animal,
    Sexo,
    Raza,
    Tipo,
    Especie,
    EstadoReproductivo,
)
from datetime import datetime
import random
import json

def populate_static_data():
    session = SessionLocal()

    try:
        if session.query(Campo).count() > 0:
            session.close()
            return

        # ---------------------
        # Crear Campos
        # ---------------------
        campo1 = Campo(
            nombre="Campo Potolo",
            descripcion="Zona experimental",
            lat=-35.5029965905756,
            lon=-60.3481471538544,
            is_preferred=True,
            usuario_id=1,
        )
        campo2 = Campo(
            nombre="Campo Tralalero",
            descripcion="Producción intensiva",
            lat=-35.6167188251521,
            lon=-59.9720424413681,
            usuario_id=1,
        )
        session.add_all([campo1, campo2])
        session.commit()

        # Guardar IDs antes de que los objetos queden detachados
        campo1_id = campo1.id
        campo2_id = campo2.id

        # ---------------------
        # Crear Parcelas
        # ---------------------
        parcela1 = Parcela(
            nombre="Lote 1",
            descripcion="Lote 1 Potolo",
            perimetro_geojson=json.dumps({
                "type": "Feature",
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [[
                        [-60.347836, -35.498322],
                        [-60.340798, -35.503877],
                        [-60.345862, -35.507895],
                        [-60.349681, -35.504855],
                        [-60.347836, -35.498322]
                    ]]
                },
                "properties": {}
            }),
            campo_id=campo1_id,
        )
        parcela2 = Parcela(
            nombre="Lote 2",
            descripcion="Lote 2 Potolo",
            perimetro_geojson=json.dumps({
                "type": "Feature",
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [[
                        [-60.357513, -35.496551],
                        [-60.359402, -35.498158],
                        [-60.357192, -35.4998],
                        [-60.357513, -35.496551]
                    ]]
                },
                "properties": {}
            }),
            campo_id=campo1_id,
        )
        parcela3 = Parcela(
            nombre="Lote 1",
            descripcion="Lote 1 Tralalero",
            perimetro_geojson=json.dumps({
                "type": "Feature",
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [[
                        [-59.970331, -35.617061],
                        [-59.970953, -35.617076],
                        [-59.971147, -35.617765],
                        [-59.970331, -35.617061]
                    ]]
                },
                "properties": {}
            }),
            campo_id=campo2_id,
        )
        session.add_all([parcela1, parcela2, parcela3])
        session.commit()

        # ---------------------
        # Crear valores básicos
        # ---------------------
        session.add_all([Sexo(nombre="H"), Sexo(nombre="M")])
        session.add_all([
            EstadoCollar(nombre=n)
            for n in ["activo", "disponible", "sin bateria", "defectuoso"]
        ])
        session.commit()

        # ---------------------
        # Crear Especies y Tipos
        # ---------------------
        especies_data = ["Bovino", "Ovino", "Porcino", "Equino", "Caprino", "Aves"]
        especies = [Especie(nombre=e) for e in especies_data]
        session.add_all(especies)
        session.flush()  # Para obtener sus IDs

        tipos_data = [
            ("Carne", "Bovino"),
            ("Leche", "Bovino"),
            ("Doble propósito", "Bovino"),

            ("Lana", "Ovino"),
            ("Carne", "Ovino"),
            ("Doble propósito", "Ovino"),

            ("Carne", "Porcino"),

            ("Tiro", "Equino"),
            ("Silla", "Equino"),

            ("Carne", "Caprino"),
            ("Leche", "Caprino"),

            ("Postura", "Aves"),
            ("Broiler", "Aves"),
        ]
        tipos = []
        for nombre, especie_nombre in tipos_data:
            especie = next(e for e in especies if e.nombre == especie_nombre)
            tipos.append(Tipo(nombre=nombre, especie_id=especie.id))
        session.add_all(tipos)
        session.flush()

        # ---------------------
        # Crear Razas
        # ---------------------
        razas_data = [
            # BOVINO
            ("Angus", "Bovino", "Carne"),
            ("Hereford", "Bovino", "Carne"),
            ("Brangus", "Bovino", "Carne"),
            ("Braford", "Bovino", "Carne"),
            ("Charolais", "Bovino", "Carne"),
            ("Limousin", "Bovino", "Carne"),
            ("Santa Gertrudis", "Bovino", "Carne"),
            ("Nelore", "Bovino", "Carne"),
            ("Senepol", "Bovino", "Carne"),
            ("Beefmaster", "Bovino", "Carne"),

            ("Holando-Argentino", "Bovino", "Leche"),
            ("Jersey", "Bovino", "Leche"),
            ("Pardo Suizo", "Bovino", "Leche"),
            ("Guernsey", "Bovino", "Leche"),
            ("Ayrshire", "Bovino", "Leche"),

            ("Simmental", "Bovino", "Doble propósito"),
            ("Shorthorn", "Bovino", "Doble propósito"),
            ("Criollo Argentino", "Bovino", "Doble propósito"),

            # OVINO
            ("Merino", "Ovino", "Lana"),
            ("Corriedale", "Ovino", "Lana"),
            ("Romney Marsh", "Ovino", "Lana"),
            ("Pampinta", "Ovino", "Lana"),
            
            ("Texel", "Ovino", "Carne"),
            ("Dorper", "Ovino", "Carne"),
            ("Suffolk", "Ovino", "Carne"),
            ("ampshire Dow", "Ovino", "Carne"),
            ("Poll Dorset", "Ovino", "Carne"),
            ("Katahdin", "Ovino", "Carne"),

            ("Ile de France", "Ovino", "Doble propósito"),

            # PORCINO
            ("Large White", "Porcino", "Carne"),
            ("Landrace", "Porcino", "Carne"),
            ("Duroc", "Porcino", "Carne"),
            ("Hampshire", "Porcino", "Carne"),
            ("Pietrain", "Porcino", "Carne"),
            ("Yorkshire", "Porcino", "Carne"),
            ("Berkshire", "Porcino", "Carne"),
            ("Spotted Poland China", "Porcino", "Carne"),
            ("Tamworth", "Porcino", "Carne"),
            ("Meishan", "Porcino", "Carne"),

            # EQUINO
            ("Percherón", "Equino", "Tiro"),
            ("Frisón", "Equino", "Tiro"),

            ("Criollo Argentino", "Equino", "Silla"),
            ("Cuarto de Milla", "Equino", "Silla"),
            ("Árabe", "Equino", "Silla"),
            ("Appaloosa", "Equino", "Silla"),
            ("Paso Peruano", "Equino", "Silla"),
            ("Mangalarga Marchador", "Equino", "Silla"),
            ("Silla Argentino", "Equino", "Silla"),
            ("Falabella", "Equino", "Silla"),
            ("Overo", "Equino", "Silla"),

            # CAPRINO
            ("Boer", "Caprino", "Carne"),
            ("Criollo", "Caprino", "Carne"),

            ("Saanen", "Caprino", "Leche"),
            ("Toggenburg", "Caprino", "Leche"),
            ("Alpino Francés", "Caprino", "Leche"),
            ("Murciano-Granadina", "Caprino", "Leche"),
            ("Anglo Nubia", "Caprino", "Leche"),
            ("La Mancha", "Caprino", "Leche"),

            # AVES
            ("Leghorn", "Aves", "Postura"),
            ("Rhode Island Red", "Aves", "Postura"),
            ("Plymouth Ro", "Aves", "Postura"),
            ("Sussex", "Aves", "Postura"),
            ("Orpington", "Aves", "Postura"),
            ("Australorp", "Aves", "Postura"),
            ("Isa Brown", "Aves", "Postura"),
            ("Hy-Line", "Aves", "Postura"),
            ("Criolla", "Aves", "Postura"),

            ("Cornish", "Aves", "Broiler"),
            ("Ross 308", "Aves", "Broiler"),
            ("Cobb 500", "Aves", "Broiler"),
        ]
        razas = []
        for nombre, especie_nombre, tipo_nombre in razas_data:
            especie = next(e for e in especies if e.nombre == especie_nombre)
            tipo = next(t for t in tipos if t.nombre == tipo_nombre and t.especie_id == especie.id)
            razas.append(Raza(nombre=nombre, especie_id=especie.id, tipo_id=tipo.id))
        session.add_all(razas)
        session.commit()

        # ---------------------
        # Crear Estados Reproductivos (simplificado)
        # ---------------------
        sexos = session.query(Sexo).all()
        especies = session.query(Especie).all()
        estados_reproductivos = []
        estados_por_sexo_especie = {
            "H": {
                "Bovino": ["Vaquillona", "Vaca vacía", "Vaca preñada", "Vaca lactante", "Vaca seca"],
                "Ovino": ["Oveja vacía", "Oveja preñada", "Oveja con cría al pie", "Oveja seca"],
                "Porcino": ["Cerda vacía", "Cerda gestante", "Cerda lactante"],
                "Equino": ["Yegua vacía", "Yegua preñada", "Yegua lactante"],
                "Caprino": ["Cabra vacía", "Cabra preñada", "Cabra lactante"],
                "Aves": ["Gallina en postura", "Gallina en recría", "Gallina fuera de postura"]
            },
            "M": {
                "Bovino": ["Toro", "Novillo"],
                "Ovino": ["Carnero", "Capón"],
                "Porcino": ["Verraco", "Capón"],
                "Equino": ["Semental", "Castrado"],
                "Caprino": ["Cabrío", "Castrado"],
                "Aves": ["Gallo reproductor"]
            }
        }
        for sexo in sexos:
            for especie in especies:
                nombres = estados_por_sexo_especie.get(sexo.nombre, {}).get(especie.nombre, [])
                for n in nombres:
                    estados_reproductivos.append(EstadoReproductivo(nombre=n, sexo_id=sexo.id, especie_id=especie.id))
        session.add_all(estados_reproductivos)
        session.commit()

        # Rangos biométricos por especie
        rangos = {
            "Bovino": {
                "peso": (400, 800),
                "altura": (120, 160),
                "long_tronco": (110, 150),
                "per_toracico": (150, 200),
                "ancho_grupa": (45, 65),
                "long_grupa": (50, 80),
            },
            "Ovino": {
                "peso": (40, 120),
                "altura": (60, 90),
                "long_tronco": (60, 90),
                "per_toracico": (80, 120),
                "ancho_grupa": (20, 35),
                "long_grupa": (30, 45),
            },
            "Porcino": {
                "peso": (100, 300),
                "altura": (70, 100),
                "long_tronco": (100, 150),
                "per_toracico": (100, 140),
                "ancho_grupa": (35, 50),
                "long_grupa": (40, 60),
            },
            "Equino": {
                "peso": (400, 600),
                "altura": (130, 160),
                "long_tronco": (120, 150),
                "per_toracico": (150, 190),
                "ancho_grupa": (45, 60),
                "long_grupa": (50, 75),
            },
            "Caprino": {
                "peso": (35, 90),
                "altura": (60, 90),
                "long_tronco": (60, 90),
                "per_toracico": (70, 110),
                "ancho_grupa": (20, 35),
                "long_grupa": (30, 45),
            },
            "Aves": {
                "peso": (2, 5),
                "altura": (30, 50),
                "long_tronco": (30, 50),
                "per_toracico": (30, 50),
                "ancho_grupa": (10, 20),
                "long_grupa": (15, 25),
            },
        }

        nombres = ["Max","Charlie","Bella","Poppy","Daisy","Buster","Alfie","Millie","Molly","Rosie","Buddy","Barney","Lola","Roxy","Ruby","Tilly","Bailey","Marley","Tia","Bonnie","Toby","Milo","Archie","Holly","Lucy","Lexi","Bruno","Rocky","Sasha","Billy","Gerbil","Bear","Luna","Oscar","Jack","Lady","Willow","Tyson","Benji","Jake","Jess","Teddy","Coco","Murphy","Sky","Honey","Lilly","Lily","Monty","Patch","Rolo","Harry","Maisy","Pippa","Trixie","Bruce","Dexter","Freddie","Jasper","Shadow","Milly","Missy","Pepper","Rex","Sally","Zeus","Bobby","Harvey","Lucky","Ollie","Pip","Sam","Storm","Amber","Belle","Cooper","Fudge","Meg","Minnie","Ozzy","Ralph","Tess","Dave","Diesel","George","Jessie","Leo","Lottie","Louie","Prince","Reggie","Simba","Skye","Basil","Betsy","Chase","Dolly","Frankie","Lulu","Maggie"]

        estados_db = session.query(EstadoReproductivo).all()
        sexos = session.query(Sexo).all()

        for i in range(100):
            # Elegir sexo al azar
            sexo = random.choice(sexos)

            # Elegir especie que tenga estados reproductivos válidos para ese sexo
            especies_validas = [e for e in especies if any(er.sexo_id == sexo.id and er.especie_id == e.id for er in estados_db)]
            if not especies_validas:
                continue  # Saltar si no hay especie válida
            especie = random.choice(especies_validas)

            # Elegir tipo de esa especie
            tipos_validos = [t for t in tipos if t.especie_id == especie.id]
            tipo = random.choice(tipos_validos)

            # Elegir raza de esa especie y tipo
            razas_validas = [r for r in razas if r.especie_id == especie.id and r.tipo_id == tipo.id]
            raza = random.choice(razas_validas)

            # Elegir estado reproductivo válido
            estados_validos = [er for er in estados_db if er.sexo_id == sexo.id and er.especie_id == especie.id]
            estado_reproductivo = random.choice(estados_validos) if estados_validos else None

            # Datos biométricos
            rango = rangos[especie.nombre]
            peso = round(random.uniform(*rango["peso"]), 2)
            altura = round(random.uniform(*rango["altura"]), 2)
            long_tronco = round(random.uniform(*rango["long_tronco"]), 2)
            per_toracico = round(random.uniform(*rango["per_toracico"]), 2)
            ancho_grupa = round(random.uniform(*rango["ancho_grupa"]), 2)
            long_grupa = round(random.uniform(*rango["long_grupa"]), 2)

            numero_partos = random.randint(0, 6) if sexo.nombre == "H" else 0
            intervalo_partos = random.randint(300, 500) if numero_partos > 0 else 0
            fertilidad = round((numero_partos * 365 / intervalo_partos), 2) if intervalo_partos else 0.0

            animal = Animal(
                nombre=random.choice(nombres),
                numero_identificacion=f"ID-{i+1:04d}",
                fecha_nacimiento=datetime(
                    random.randint(2018, 2022), random.randint(1, 12), random.randint(1, 28)
                ),
                peso=peso,
                altura_cruz=altura,
                longitud_tronco=long_tronco,
                perimetro_toracico=per_toracico,
                ancho_grupa=ancho_grupa,
                longitud_grupa=long_grupa,
                estado_reproductivo_id=estado_reproductivo.id if estado_reproductivo else None,
                numero_partos=numero_partos,
                intervalo_partos=intervalo_partos,
                fertilidad=fertilidad,
                ubicacion_sensor="cuello",
                parcela_id=random.choice([parcela1.id, parcela2.id, parcela3.id]),
                raza_id=raza.id,
                sexo_id=sexo.id
            )
            session.add(animal)
            session.flush()

        session.commit()

    # def nodos_autorizados():
    #     if NodoAutorizado.query.count() > 0:
    #         return

    #     for i in range(1, 101):
    #         nodo = NodoAutorizado(
    #             collar_id=i,
    #             client_id=f"nodo-test-{i:03d}",
    #             certificado_cn="",
    #             esta_autorizado=True,
    #             fecha_autorizacion=datetime.now(),
    #             usuario_id=1,
    #             observaciones="",
    #         )
    #         session.add(nodo)
    #     session.commit()

    finally:
        session.close()
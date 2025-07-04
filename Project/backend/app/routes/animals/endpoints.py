# ~/backend.app /backend/src/Routes/animals/routes.py
from flask import Blueprint, request, jsonify, make_response
from flask_login import login_required, current_user
from sqlalchemy.orm import joinedload
from sqlalchemy import func
from backend.app  import db
from backend.app.models import (
    Animal,
    Parcela,
    Collar,
    Temperatura,
    UbicacionActual,
    AsignacionCollar,
    Especie,
    Tipo,
    Raza,
    Sexo,
    EstadoReproductivo,
    EstadoCollar,
)
from datetime import datetime

from Project.backend.app.routes.collares.endpoints import get_estado_collar_id

from shapely.geometry import shape, Point
import json
animals = Blueprint("animals", __name__, url_prefix="/api/animals")

# --- Funciones auxiliares para validacion y resolucion ---
# Carga las entidades de referencia para optimizar las busquedas durante la importacion masiva
_sexos_map = None
_especies_map = None
_tipos_map = None
_razas_map = None
_estados_reproductivos_map = None
_parcelas_map = None


def _load_animal_related_entities(user_id):
    """Carga los datos de referencia (sexos, especies, etc.) y parcelas del usuario actual."""
    global _sexos_map, _especies_map, _tipos_map, _razas_map, _estados_reproductivos_map, _parcelas_map

    # Cargar entidades globales una vez
    if _sexos_map is None:
        _sexos_map = {s.nombre.lower(): s for s in Sexo.query.all()}
        _especies_map = {e.nombre.lower(): e for e in Especie.query.all()}
        _tipos_map = {
            (t.nombre.lower(), t.especie.nombre.lower()): t
            for t in Tipo.query.options(joinedload(Tipo.especie)).all()
        }
        _razas_map = {
            (r.nombre.lower(), r.tipo.nombre.lower(), r.especie.nombre.lower()): r
            for r in Raza.query.options(joinedload(Raza.tipo))
            .options(joinedload(Raza.especie))
            .all()
        }
        _estados_reproductivos_map = {
            (er.nombre.lower(), er.sexo.nombre.lower(), er.especie.nombre.lower()): er
            for er in EstadoReproductivo.query.options(
                joinedload(EstadoReproductivo.sexo)
            )
            .options(joinedload(EstadoReproductivo.especie))
            .all()
        }

    # Parcelas son especificas del usuario, se recargan por cada importacion si el usuario cambia
    # O si la cache es por usuario, etc. Para simplificar, asumiremos que se carga con el current_user
    _parcelas_map = {
        p.nombre.lower(): p
        for p in Parcela.query.filter_by(campo=current_user.campos.first()).all()
    }

    if not all(
        [
            _sexos_map,
            _especies_map,
            _tipos_map,
            _razas_map,
            _estados_reproductivos_map,
            _parcelas_map,
        ]
    ):
        print(
            "WARNING: Faltan entidades relacionadas criticas para animales en la base de datos."
        )


# Registramos un callback que se ejecuta antes de la primera solicitud para cargar entidades
@animals.before_app_first_request
def initialize_animal_related_entities():
    # Solo inicializar las que no dependen del current_user aqui.
    # Las que dependen de current_user (como parcelas) se cargaran en la funcion de importacion.
    global _sexos_map, _especies_map, _tipos_map, _razas_map, _estados_reproductivos_map

    try:
        if _sexos_map is None:
            _sexos_map = {s.nombre.lower(): s for s in Sexo.query.all()}
            _especies_map = {e.nombre.lower(): e for e in Especie.query.all()}
            _tipos_map = {
                (t.nombre.lower(), t.especie.nombre.lower()): t
                for t in Tipo.query.options(joinedload(Tipo.especie)).all()
            }
            _razas_map = {
                (r.nombre.lower(), r.tipo.nombre.lower(), r.especie.nombre.lower()): r
                for r in Raza.query.options(joinedload(Raza.tipo))
                .options(joinedload(Raza.especie))
                .all()
            }
            _estados_reproductivos_map = {
                (
                    er.nombre.lower(),
                    er.sexo.nombre.lower(),
                    er.especie.nombre.lower(),
                ): er
                for er in EstadoReproductivo.query.options(
                    joinedload(EstadoReproductivo.sexo)
                )
                .options(joinedload(EstadoReproductivo.especie))
                .all()
            }
    except Exception as e:
        print(
            f"ERROR: No se pudieron cargar entidades de referencia de animales al iniciar el Blueprint: {e}"
        )

# -----------------------------
# 1. Obtener lista completa de animales
# -----------------------------
@animals.route("/", methods=["GET"])
@login_required
def api_list_full_animales():
    animales_query = (
        db.session.query(Animal)
        .options(
            joinedload(Animal.parcela).joinedload(Parcela.campo),
            joinedload(Animal.raza).joinedload(Raza.tipo),
            joinedload(Animal.raza).joinedload(Raza.especie),
            joinedload(Animal.sexo),
            joinedload(Animal.estado_reproductivo),
        )
        .all()
    )

    collares_asignados_query = (
        db.session.query(
            AsignacionCollar.animal_id,
            Collar.id.label("collar_id"),
            Collar.codigo.label("codigo"),
            Collar.bateria.label("bateria"),
            EstadoCollar.nombre.label("estado_nombre"),
            Collar.ultima_actividad.label("ultima_actividad"),
        )
        .join(Collar, AsignacionCollar.collar_id == Collar.id)
        .join(EstadoCollar, Collar.estado_collar_id == EstadoCollar.id)
        .filter(AsignacionCollar.fecha_fin.is_(None))
        .all()
    )

    collares_dict = {
        assign.animal_id: {
            "collar_id": assign.collar_id,
            "codigo": assign.codigo,
            "bateria": assign.bateria,
            "estado": assign.estado_nombre,
            "ultima_actividad": (
                assign.ultima_actividad.isoformat() if assign.ultima_actividad else None
            ),
        }
        for assign in collares_asignados_query
    }

    ubicaciones = db.session.query(
        UbicacionActual.animal_id,
        UbicacionActual.lat,
        UbicacionActual.lon,
        UbicacionActual.timestamp,
    ).all()
    ubicacion_dict = {
        u.animal_id: {
            "lat": u.lat,
            "lon": u.lon,
            "timestamp": u.timestamp.isoformat() if u.timestamp else None,
        }
        for u in ubicaciones
    }

    subquery_temp = (
        db.session.query(
            Temperatura.collar_id, func.max(Temperatura.timestamp).label("max_ts")
        )
        .group_by(Temperatura.collar_id)
        .subquery()
    )

    temp_query = (
        db.session.query(
            Temperatura.collar_id, Temperatura.timestamp, Temperatura.corporal
        )
        .join(
            subquery_temp,
            (Temperatura.collar_id == subquery_temp.c.collar_id)
            & (Temperatura.timestamp == subquery_temp.c.max_ts),
        )
        .all()
    )
    temp_dict = {
        t.collar_id: {
            "corporal": t.corporal,
            "timestamp": t.timestamp.isoformat() if t.timestamp else None,
        }
        for t in temp_query
    }

    result = []
    for animal in animales_query:
        collar_data = collares_dict.get(animal.id)
        ubic = ubicacion_dict.get(animal.id)
        # Correccion: temp_dict usa collar_id, no animal.id
        temp = (
            temp_dict.get(collar_data["collar_id"])
            if collar_data and collar_data.get("collar_id")
            else None
        )

        animal_data = {
            "animal_id": animal.id,
            "nombre": animal.nombre,
            "numero_identificacion": animal.numero_identificacion,
            "fecha_nacimiento": (
                animal.fecha_nacimiento.isoformat() if animal.fecha_nacimiento else None
            ),
            "peso": animal.peso,
            "altura_cruz": animal.altura_cruz,
            "longitud_tronco": animal.longitud_tronco,
            "perimetro_toracico": animal.perimetro_toracico,
            "ancho_grupa": animal.ancho_grupa,
            "longitud_grupa": animal.longitud_grupa,
            "ubicacion_sensor": animal.ubicacion_sensor,
            "parcela_id": animal.parcela_id,
            "raza_id": animal.raza_id,
            "sexo_id": animal.sexo_id,
            "estado_reproductivo_id": animal.estado_reproductivo_id,
            "parcela": animal.parcela.nombre if animal.parcela else None,
            "especie": (
                animal.raza.especie.nombre
                if animal.raza and animal.raza.especie
                else None
            ),
            "raza": animal.raza.nombre if animal.raza else None,
            "tipo": (
                animal.raza.tipo.nombre if animal.raza and animal.raza.tipo else None
            ),
            "sexo": animal.sexo.nombre if animal.sexo else None,
            "estado_reproductivo_nombre": (
                animal.estado_reproductivo.nombre
                if animal.estado_reproductivo
                else None
            ),
            "numero_partos": animal.numero_partos,
            "intervalo_partos": animal.intervalo_partos,
            "fertilidad": animal.fertilidad,
            "lat": ubic['lat'] if ubic else None,
            "lon": ubic['lon'] if ubic else None,
            "temperatura_corporal_actual": temp["corporal"] if temp else None,
            "hora_temperatura": temp["timestamp"] if temp else None,
            "campo": (
                animal.parcela.campo.nombre
                if animal.parcela and animal.parcela.campo
                else None
            ),
            "collar_asignado": collar_data if collar_data else None,
        }
        result.append(animal_data)

    return jsonify(result)



def is_animal_outside(animal, lon, lat):
    try:
        if not animal.parcela or not animal.parcela.perimetro_geojson:
            return False

        poly = shape(json.loads(animal.parcela.perimetro_geojson)['geometry'])
        point = Point(lon, lat)
        return not poly.contains(point)
    except Exception as e:
        print(f"[ERROR] Error en is_animal_outside: {e}")
        return False


@animals.route("/<int:campo_id>/entities", methods=["GET"])
@login_required
def api_cluster_animals(campo_id):
    animals_query = (
        db.session.query(Animal)
        .join(Parcela)
        .filter(Parcela.campo_id == campo_id)
        .options(
            joinedload(Animal.parcela).joinedload(Parcela.campo),
            joinedload(Animal.raza).joinedload(Raza.tipo),
            joinedload(Animal.raza).joinedload(Raza.especie),
            joinedload(Animal.sexo),
            joinedload(Animal.estado_reproductivo),
        )
        .all()
    )

    collares_dict = {
        a.animal_id: {
            "collar_id": a.collar_id,
            "codigo": a.codigo,
            "bateria": a.bateria,
            "estado": a.estado_nombre,
            "ultima_actividad": a.ultima_actividad.isoformat() if a.ultima_actividad else None,
        }
        for a in db.session.query(
            AsignacionCollar.animal_id,
            Collar.id.label("collar_id"),
            Collar.codigo,
            Collar.bateria,
            EstadoCollar.nombre.label("estado_nombre"),
            Collar.ultima_actividad
        )
        .join(Collar, AsignacionCollar.collar_id == Collar.id)
        .join(EstadoCollar, Collar.estado_collar_id == EstadoCollar.id)
        .filter(AsignacionCollar.fecha_fin.is_(None))
        .all()
    }

    ubicacion_dict = {
        u.animal_id: {
            "lat": u.lat,
            "lon": u.lon,
            "timestamp": u.timestamp.isoformat() if u.timestamp else None,
        }
        for u in db.session.query(
            UbicacionActual.animal_id,
            UbicacionActual.lat,
            UbicacionActual.lon,
            UbicacionActual.timestamp,
        ).all()
    }

    subquery_temp = (
        db.session.query(
            Temperatura.collar_id,
            func.max(Temperatura.timestamp).label("max_ts")
        ).group_by(Temperatura.collar_id).subquery()
    )

    temp_dict = {
        t.collar_id: {
            "corporal": t.corporal,
            "timestamp": t.timestamp.isoformat() if t.timestamp else None,
        }
        for t in db.session.query(
            Temperatura.collar_id,
            Temperatura.timestamp,
            Temperatura.corporal
        ).join(
            subquery_temp,
            (Temperatura.collar_id == subquery_temp.c.collar_id)
            & (Temperatura.timestamp == subquery_temp.c.max_ts)
        ).all()
    }

    inside_animals = []
    outside_animals = []

    for animal in animals_query:
        collar_data = collares_dict.get(animal.id)
        coords = ubicacion_dict.get(animal.id)

        lon = coords["lon"] if coords else None
        lat = coords["lat"] if coords else None

        outside = is_animal_outside(animal, lon, lat) if lon and lat else None

        temp = (
            temp_dict.get(collar_data["collar_id"])
            if collar_data and collar_data.get("collar_id")
            else None
        )

        if collar_data:
            animal_data = {
                "animal_id": animal.id,
                "nombre": animal.nombre,
                "numero_identificacion": animal.numero_identificacion,
                "fecha_nacimiento": animal.fecha_nacimiento.isoformat() if animal.fecha_nacimiento else None,
                "peso": animal.peso,
                "ubicacion_sensor": animal.ubicacion_sensor,
                "parcela": animal.parcela.nombre if animal.parcela else None,
                "especie": animal.raza.especie.nombre if animal.raza and animal.raza.especie else None,
                "raza": animal.raza.nombre if animal.raza else None,
                "tipo": animal.raza.tipo.nombre if animal.raza and animal.raza.tipo else None,
                "sexo": animal.sexo.nombre if animal.sexo else None,
                "estado_reproductivo": animal.estado_reproductivo.nombre if animal.estado_reproductivo else None,
                "lat": lat,
                "lon": lon,
                "temperatura_corporal_actual": temp["corporal"] if temp else None,
                "hora_temperatura": temp["timestamp"] if temp else None,
                "campo": animal.parcela.campo.nombre,
                "is_outside": outside,
                "collar_asignado": collar_data,
            }

            if outside is not None:
                (outside_animals if outside else inside_animals).append(animal_data)

    return jsonify({
        "inside": inside_animals,
        "outside": outside_animals
    })

# -----------------------------
# 2. Obtener opciones de filtros para animales
# -----------------------------
@animals.route("/options", methods=["GET"])
@login_required
def api_get_animal_options():
    especies = (
        db.session.query(Especie.id, Especie.nombre).order_by(Especie.nombre).all()
    )
    tipos = (
        db.session.query(Tipo.id, Tipo.nombre, Tipo.especie_id)
        .order_by(Tipo.nombre)
        .all()
    )
    razas = (
        db.session.query(Raza.id, Raza.nombre, Raza.especie_id, Raza.tipo_id)
        .order_by(Raza.nombre)
        .all()
    )
    sexos = db.session.query(Sexo.id, Sexo.nombre).order_by(Sexo.nombre).all()
    parcelas = (
        db.session.query(Parcela.id, Parcela.nombre).order_by(Parcela.nombre).all()
    )

    estados = (
        db.session.query(EstadoReproductivo).order_by(EstadoReproductivo.nombre).all()
    )

    response_data = {
        "especies": [{"id": e.id, "nombre": e.nombre} for e in especies],
        "tipos": [
            {"id": t.id, "nombre": t.nombre, "especie_id": t.especie_id} for t in tipos
        ],
        "razas": [
            {
                "id": r.id,
                "nombre": r.nombre,
                "especie_id": r.especie_id,
                "tipo_id": r.tipo_id,
            }
            for r in razas
        ],
        "sexos": [{"id": s.id, "nombre": s.nombre} for s in sexos],
        "parcelas": [{"id": p.id, "nombre": p.nombre} for p in parcelas],
        "estados_reproductivos": [
            {
                "id": er.id,
                "nombre": er.nombre,
                "sexo_id": er.sexo_id,
                "especie_id": er.especie_id,
            }
            for er in estados
        ],
    }

    return jsonify(response_data)


# -----------------------------
# 3. Obtener ficha simplificada de animal (para detalles rapidos)
# -----------------------------
@animals.route("/<int:animal_id>/simple_sheet", methods=["GET"])
@login_required
def api_animals_ficha_simple(animal_id):
    animal = (
        db.session.query(Animal)
        .options(
            joinedload(Animal.raza).joinedload(Raza.tipo),
            joinedload(Animal.raza).joinedload(Raza.especie),
            joinedload(Animal.sexo),
            joinedload(Animal.estado_reproductivo),
        )
        .filter_by(id=animal_id)
        .first_or_404()
    )

    asignacion_activa = AsignacionCollar.query.filter_by(
        animal_id=animal_id, fecha_fin=None
    ).first()
    collar = None
    if asignacion_activa:
        collar = (
            db.session.query(Collar)
            .options(joinedload(Collar.estado_collar))  # Cargar el objeto EstadoCollar
            .get(asignacion_activa.collar_id)
        )

    ubicacion = UbicacionActual.query.filter_by(animal_id=animal_id).first()

    temperatura_data = None
    if collar:
        subquery = (
            db.session.query(
                Temperatura.collar_id, func.max(Temperatura.timestamp).label("max_ts")
            )
            .filter(Temperatura.collar_id == collar.id)
            .group_by(Temperatura.collar_id)
            .subquery()
        )

        temperatura_data = (
            db.session.query(Temperatura.corporal, Temperatura.timestamp)
            .join(
                subquery,
                (Temperatura.collar_id == subquery.c.collar_id)
                & (Temperatura.timestamp == subquery.c.max_ts),
            )
            .first()
        )

    return jsonify(
        {
            "id": animal.id,
            "nombre": animal.nombre,
            "numero_identificacion": animal.numero_identificacion,
            "raza": animal.raza.nombre if animal.raza else None,
            "sexo": animal.sexo.nombre if animal.sexo else None,
            "tipo": (
                animal.raza.tipo.nombre if animal.raza and animal.raza.tipo else None
            ),
            "estado_reproductivo_id": (
                animal.estado_reproductivo.id if animal.estado_reproductivo else None
            ),
            "estado_reproductivo_nombre": (
                animal.estado_reproductivo.nombre
                if animal.estado_reproductivo
                else None
            ),
            "lat": ubicacion.lat if ubicacion else None,
            "lon": ubicacion.lon if ubicacion else None,
            "timestamp": (
                ubicacion.timestamp.isoformat()
                if ubicacion and ubicacion.timestamp
                else None
            ),
            "temperatura": temperatura_data.corporal if temperatura_data else None,
            "hora_temperatura": (
                temperatura_data.timestamp.isoformat()
                if temperatura_data and temperatura_data.timestamp
                else None
            ),
            "collar_id": collar.id if collar else None,
            "estado_collar": (
                collar.estado_collar.nombre if collar and collar.estado_collar else None
            ),
            "bateria": collar.bateria if collar else None,
        }
    )


# -----------------------------
# 4. Obtener ficha completa de animal (para edicion)
# -----------------------------
@animals.route("/<int:animal_id>/complete_sheet", methods=["GET"])
@login_required
def api_animals_ficha_completa(animal_id):
    animal = (
        db.session.query(Animal)
        .options(
            joinedload(Animal.raza).joinedload(Raza.tipo),
            joinedload(Animal.raza).joinedload(Raza.especie),
            joinedload(Animal.sexo),
            joinedload(Animal.estado_reproductivo),
            joinedload(Animal.parcela),
        )
        .filter_by(id=animal_id)
        .first()
    )

    if not animal:
        return jsonify({"status": "error", "message": "Animal no encontrado"}), 404

    return jsonify(
        {
            "animal_id": animal.id,
            "nombre": animal.nombre,
            "numero_identificacion": animal.numero_identificacion,
            "fecha_nacimiento": (
                animal.fecha_nacimiento.isoformat() if animal.fecha_nacimiento else None
            ),
            "ubicacion_sensor": animal.ubicacion_sensor,
            "peso": animal.peso,
            "altura_cruz": animal.altura_cruz,
            "longitud_tronco": animal.longitud_tronco,
            "perimetro_toracico": animal.perimetro_toracico,
            "ancho_grupa": animal.ancho_grupa,
            "longitud_grupa": animal.longitud_grupa,
            "estado_reproductivo_id": animal.estado_reproductivo_id,
            "numero_partos": animal.numero_partos,
            "intervalo_partos": animal.intervalo_partos,
            "fertilidad": animal.fertilidad,
            "parcela_id": animal.parcela_id,
            "raza_id": animal.raza_id,
            "sexo_id": animal.sexo_id,
            "tipo_id": (
                animal.raza.tipo.id if animal.raza and animal.raza.tipo else None
            ),
            "especie_id": (
                animal.raza.especie.id if animal.raza and animal.raza.especie else None
            ),
        }
    )


# -----------------------------
# 5. Crear un nuevo animal
# -----------------------------
@animals.route("/", methods=["POST"])
@login_required
def api_create_animal():
    data = request.get_json()

    nombre = data.get("nombre")
    sexo_id = data.get("sexo_id")
    raza_id = data.get("raza_id")
    parcela_id = data.get("parcela_id")

    if not all([nombre, sexo_id, raza_id, parcela_id]):
        return (
            jsonify(
                {
                    "status": "error",
                    "message": "Faltan datos obligatorios (nombre, identificacion, sexo, especie, tipo, raza, parcela).",
                }
            ),
            400,
        )

    parcela = Parcela.query.get(parcela_id)
    if not parcela or parcela.campo.usuario_id != current_user.id:
        return (
            jsonify(
                {"status": "error", "message": "Parcela no valida o no autorizada"}
            ),
            403,
        )

    nuevo = Animal(
        nombre=nombre,
        numero_identificacion=f"ID-x",
        raza_id=raza_id,
        sexo_id=sexo_id,
        fecha_nacimiento=(
            datetime.strptime(data["fecha_nacimiento"], "%Y-%m-%d")
            if data.get("fecha_nacimiento")
            else None
        ),
        peso=data.get("peso"),
        altura_cruz=data.get("altura_cruz"),
        longitud_tronco=data.get("longitud_tronco"),
        perimetro_toracico=data.get("perimetro_toracico"),
        ancho_grupa=data.get("ancho_grupa"),
        longitud_grupa=data.get("longitud_grupa"),
        estado_reproductivo_id=data.get("estado_reproductivo_id"),
        numero_partos=data.get("numero_partos", ""),
        intervalo_partos=data.get("intervalo_partos", ""),
        fertilidad=0,
        ubicacion_sensor=data.get("ubicacion_sensor"),
        parcela_id=parcela_id,
    )
    db.session.add(nuevo)
    db.session.commit()

    return (
        jsonify(
            {
                "status": "ok",
                "message": "Animal creado correctamente",
                "animal_id": nuevo.id,
            }
        ),
        201,
    )


# -----------------------------
# 6. Actualizar un animal existente
# -----------------------------
@animals.route("/<int:animal_id>", methods=["PUT"])
@login_required
def api_update_animal(animal_id):
    animal = Animal.query.get_or_404(animal_id)
    if animal.parcela and animal.parcela.campo.usuario_id != current_user.id:
        return (
            jsonify(
                {
                    "status": "error",
                    "message": "No autorizado para actualizar este animal",
                }
            ),
            403,
        )

    data = request.get_json()

    animal.nombre = data.get("nombre", animal.nombre)
    animal.numero_identificacion = data.get(
        "numero_identificacion", animal.numero_identificacion
    )

    animal.raza_id = data.get("raza_id", animal.raza_id)
    animal.sexo_id = data.get("sexo_id", animal.sexo_id)
    animal.estado_reproductivo_id = data.get(
        "estado_reproductivo_id", animal.estado_reproductivo_id
    )

    fecha_nacimiento_str = data.get("fecha_nacimiento")
    if fecha_nacimiento_str:
        animal.fecha_nacimiento = datetime.strptime(fecha_nacimiento_str, "%Y-%m-%d")
    elif fecha_nacimiento_str is not None:
        animal.fecha_nacimiento = None

    animal.peso = data.get("peso", animal.peso)
    animal.altura_cruz = data.get("altura_cruz", animal.altura_cruz)
    animal.longitud_tronco = data.get("longitud_tronco", animal.longitud_tronco)
    animal.perimetro_toracico = data.get(
        "perimetro_toracico", animal.perimetro_toracico
    )
    animal.ancho_grupa = data.get("ancho_grupa", animal.ancho_grupa)
    animal.longitud_grupa = data.get("longitud_grupa", animal.longitud_grupa)

    animal.numero_partos = data.get("numero_partos", animal.numero_partos)
    animal.intervalo_partos = data.get("intervalo_partos", animal.intervalo_partos)
    animal.fertilidad = data.get("fertilidad", animal.fertilidad)
    animal.ubicacion_sensor = data.get("ubicacion_sensor", animal.ubicacion_sensor)

    new_parcela_id = data.get("parcela_id")
    if new_parcela_id is not None:
        if new_parcela_id:
            parcela = Parcela.query.get(new_parcela_id)
            if not parcela or parcela.campo.usuario_id != current_user.id:
                return (
                    jsonify(
                        {
                            "status": "error",
                            "message": "Parcela no valida o no autorizada",
                        }
                    ),
                    403,
                )
            animal.parcela_id = new_parcela_id
        else:
            animal.parcela_id = None

    db.session.commit()
    return jsonify({"status": "ok", "message": "Animal actualizado correctamente"})


# -----------------------------
# 7. Eliminar un animal
# -----------------------------
@animals.route("/<int:animal_id>", methods=["DELETE"])
@login_required
def api_delete_animal(animal_id):
    animal = Animal.query.get_or_404(animal_id)
    if animal.parcela and animal.parcela.campo.usuario_id != current_user.id:
        return jsonify({"status": "error", "message": "No autorizado"}), 403

    asignacion_activa = AsignacionCollar.query.filter_by(
        animal_id=animal_id, fecha_fin=None
    ).first()
    if asignacion_activa:
        asignacion_activa.fecha_fin = datetime.now()
        collar = Collar.query.get(asignacion_activa.collar_id)
        disponible_id = get_estado_collar_id("disponible")
        if disponible_id is None:
            return (
                jsonify(
                    {
                        "status": "error",
                        "message": "Estado 'disponible' no encontrado para desasignacion.",
                    }
                ),
                500,
            )

        if collar:
            collar.estado_collar_id = disponible_id
        db.session.add(asignacion_activa)

    db.session.delete(animal)
    db.session.commit()
    return jsonify({"status": "ok", "message": "Animal eliminado correctamente"})

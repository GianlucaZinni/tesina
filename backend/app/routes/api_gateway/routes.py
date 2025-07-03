# ~/Project/backend/src/Routes/api_gateway/routes.py
from flask import Blueprint, request, jsonify
from backend.app import db
from backend.app.models import Ubicacion, Temperatura, Acelerometro, NodoAutorizado, Animal, AsignacionCollar, UbicacionActual
from datetime import datetime
from sqlalchemy import desc
from sqlalchemy.orm import joinedload

api_gateway = Blueprint('api_gateway', __name__, url_prefix="/api")

@api_gateway.route('/datos', methods=['POST'])
def recibir_datos():
    data = request.get_json()
    print(data)
    print("HEADER:", request.headers)

    if not data:
        return jsonify({"status": "error", "message": "Datos JSON faltantes"}), 400

    # Autenticación basada en client_id (nodo autorizado)
    client_id = request.headers.get("X-Client-ID")
    print(client_id)

    if not client_id:
        return jsonify({"status": "error", "message": "Falta el encabezado 'X-Client-ID'"}), 401

    nodo = NodoAutorizado.query.filter_by(client_id=client_id, esta_autorizado=True).first()
    print(nodo)
    if not nodo:
        return jsonify({"status": "error", "message": "Nodo no autorizado"}), 403

    collar = nodo.collar
    if not collar:
        return jsonify({"status": "error", "message": "Collar no asociado al nodo"}), 404

    try:
        timestamp_str = data.get("timestamp")
        lat = data.get("lat")
        lon = data.get("lon")
        temperatura_corp = data.get("temperatura")
        temperatura_amb = data.get("temperatura_ambiente")
        acelerometro = data.get("acelerometro")

        timestamp = datetime.strptime(timestamp_str, "%Y-%m-%dT%H:%M:%S")

        # Ubicación
        if lat is not None and lon is not None:
            ubicacion = Ubicacion(
                timestamp=timestamp,
                lat=lat,
                lon=lon,
                collar_id=collar.id
            )
            db.session.add(ubicacion)

            asignacion = AsignacionCollar.query.filter_by(collar_id=collar.id, fecha_fin=None).first()
            if asignacion and asignacion.animal_id:
                actual = UbicacionActual.query.filter_by(animal_id=asignacion.animal_id).first()
                if actual:
                    actual.lat = lat
                    actual.lon = lon
                    actual.timestamp = timestamp
                else:
                    nueva = UbicacionActual(
                        animal_id=asignacion.animal_id,
                        lat=lat,
                        lon=lon,
                        timestamp=timestamp
                    )
                    db.session.add(nueva)

                # Temperatura
                if temperatura_corp is not None:
                    temperatura = Temperatura(
                        timestamp=timestamp,
                        corporal=temperatura_corp,
                        ambiente=temperatura_amb,
                        collar_id=collar.id
                    )
                    db.session.add(temperatura)

        # Acelerómetro
        if acelerometro:
            aceleracion = Acelerometro(
                timestamp=timestamp,
                x=acelerometro.get("x"),
                y=acelerometro.get("y"),
                z=acelerometro.get("z"),
                collar_id=collar.id
            )
            db.session.add(aceleracion)

        db.session.commit()

        return jsonify({"status": "ok", "message": "Datos almacenados correctamente"}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"status": "error", "message": str(e)}), 500
    
@api_gateway.route('/debug/nodo/<client_id>')
def debug_nodo(client_id):
    nodo = NodoAutorizado.query.filter_by(client_id=client_id).first()
    if not nodo:
        return {"estado": "error", "mensaje": "Nodo no encontrado"}
    return {
        "estado": "ok",
        "client_id": nodo.client_id,
        "esta_autorizado": nodo.esta_autorizado,
        "collar_id": nodo.collar_id,
        "collar_codigo": nodo.collar.codigo if nodo.collar else None
    }

@api_gateway.route('/collares/estado', methods=['GET'])
def collares_estado():
    # Obtener asignaciones activas con JOIN a Animal y Collar
    asignaciones = db.session.query(AsignacionCollar).options(
        joinedload(AsignacionCollar.animal),
        joinedload(AsignacionCollar.usuario_id),
        joinedload(AsignacionCollar.collar)
    ).filter(
        AsignacionCollar.fecha_fin.is_(None)
    ).all()

    resultado = []

    for asignacion in asignaciones:
        animal = asignacion.animal
        collar = asignacion.collar

        if not animal or not collar:
            continue

        ubicacion = Ubicacion.query.filter_by(collar_id=collar.id).order_by(desc(Ubicacion.timestamp)).first()
        temperatura = Temperatura.query.filter_by(collar_id=collar.id).order_by(desc(Temperatura.timestamp)).first()
        acelerometro = Acelerometro.query.filter_by(collar_id=collar.id).order_by(desc(Acelerometro.timestamp)).first()

        resultado.append({
            "animal_id": animal.id,
            "nombre": animal.nombre,
            "collar_id": collar.id,
            "collar_codigo": collar.codigo,
            "temperatura": temperatura.corporal if temperatura else None,
            "ubicacion": {
                "lat": ubicacion.lat,
                "lon": ubicacion.lon
            } if ubicacion else None,
            "acelerometro": {
                "x": acelerometro.x,
                "y": acelerometro.y,
                "z": acelerometro.z
            } if acelerometro else None,
            "timestamp": ubicacion.timestamp.strftime("%Y-%m-%d %H:%M:%S") if ubicacion else None
        })

    return jsonify(resultado)

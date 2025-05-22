from flask import Blueprint, request, jsonify
from Project import db
from Project.models import Ubicacion, Temperatura, Acelerometro, NodoAutorizado
from datetime import datetime

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

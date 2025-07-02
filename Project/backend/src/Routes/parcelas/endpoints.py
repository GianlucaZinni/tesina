# ~/Project/backend/src/Routes/map/routes.py
from flask import Blueprint, request, jsonify
from flask_login import current_user, login_required
from Project import db
from Project.models import Campo, Parcela, Animal, AsignacionCollar, Tipo, Raza, Sexo
from sqlalchemy import func
import json

parcelas = Blueprint("parcelas", __name__, url_prefix="/api/parcelas")

# --------------------------
# . Parcelas y campos (para mapa)
# --------------------------
@parcelas.route('/init')
@login_required
def api_parcela_init():
    campos_usuario = Campo.query.filter_by(usuario_id=current_user.id).all()

    campos_data = {
        c.id: {
            "lat": c.lat,
            "lon": c.lon,
            "nombre": c.nombre,
            "descripcion": c.descripcion,
            "is_preferred": c.is_preferred  # <-- lo incluimos directamente en el dict
        }
        for c in campos_usuario if c.lat and c.lon
    }

    parcelas_data = {}
    for parcela in Parcela.query.filter(Parcela.campo_id.in_([c.id for c in campos_usuario])).all():
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

    # Buscar campo preferido explícitamente
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

    return jsonify({
        "campos": campos_data,
        "parcelas": parcelas_data,
        "center": {"lat": center_lat, "lon": center_lon},
        "campo_preferido_id": campo_preferido_id
    })

# --------------------------
# . Animales por parcela
# --------------------------
@parcelas.route("/animales/resumen", methods=["GET"])
@login_required
def api_parcela_animals():
    # 1. Totales de animales y collares activos por parcela con nombre
    resumen_base = db.session.query(
        Parcela.id,
        Parcela.nombre,
        func.count(Animal.id).label("total_animales"),
        func.count(AsignacionCollar.collar_id).label("total_collares")
    ).outerjoin(Animal, Animal.parcela_id == Parcela.id
    ).outerjoin(
        AsignacionCollar,
        (AsignacionCollar.animal_id == Animal.id) & (AsignacionCollar.fecha_fin == None)
    ).group_by(Parcela.id, Parcela.nombre).all()

    # 2. Datos detallados por tipo, sexo y raza
    detalles = db.session.query(
        Animal.parcela_id,
        Tipo.nombre.label("tipo_nombre"),
        Sexo.nombre.label("sexo_nombre"),
        Raza.nombre.label("raza_nombre"),
        func.count(Animal.id).label("cantidad")
    ).join(Raza, Animal.raza_id == Raza.id
    ).join(Tipo, Raza.tipo_id == Tipo.id
    ).join(Sexo, Animal.sexo_id == Sexo.id
    ).group_by(Animal.parcela_id, Tipo.nombre, Sexo.nombre, Raza.nombre).all()

    # 3. Armar estructura combinada
    resumen_final = {}

    for parcela_id, nombre, total_animales, total_collares in resumen_base:
        resumen_final[parcela_id] = {
            "parcela_id": parcela_id,
            "nombre": nombre,
            "total_animales": total_animales,
            "total_collares": total_collares,
            "tipos": {}
        }

    for parcela_id, tipo, sexo, raza, cantidad in detalles:
        if parcela_id not in resumen_final:
            resumen_final[parcela_id] = {
                "parcela_id": parcela_id,
                "nombre": None,
                "total_animales": 0,
                "total_collares": 0,
                "tipos": {}
            }

        tipos = resumen_final[parcela_id]["tipos"]

        if tipo not in tipos:
            tipos[tipo] = {
                "cantidad": 0,
                "por_sexo": {},
                "por_raza": {}
            }

        tipos[tipo]["cantidad"] += cantidad
        tipos[tipo]["por_sexo"][sexo] = tipos[tipo]["por_sexo"].get(sexo, 0) + cantidad
        tipos[tipo]["por_raza"][raza] = tipos[tipo]["por_raza"].get(raza, 0) + cantidad

    return jsonify(list(resumen_final.values()))

# --------------------------
# . Crear parcela
# --------------------------
@parcelas.route('/create', methods=['POST'])
@login_required
def api_create_parcela():
    data = request.get_json()
    campo_id = data.get("campo_id")
    nombre = data.get("nombre")
    descripcion = data.get("descripcion")
    area = data.get("area")
    perimetro_geojson = data.get("perimetro_geojson")

    if not campo_id or not nombre or not perimetro_geojson:
        return jsonify({"status": "error", "message": "Faltan datos obligatorios"}), 400

    campo = Campo.query.get(campo_id)
    if not campo or campo.usuario_id != current_user.id:
        return jsonify({"status": "error", "message": "Campo no válido o no autorizado"}), 403

    nueva = Parcela(
        nombre=nombre,
        descripcion=descripcion,
        perimetro_geojson=json.dumps(perimetro_geojson),
        area=area,
        campo_id=campo_id
    )
    db.session.add(nueva)
    db.session.commit()

    return jsonify({"status": "ok", "message": "Parcela creada correctamente"})

# --------------------------
# . Editar parcela
# --------------------------
@parcelas.route('/<int:parcela_id>/update', methods=['POST'])
@login_required
def api_update_parcela(parcela_id):
    parcela = Parcela.query.get_or_404(parcela_id)
    if parcela.campo.usuario_id != current_user.id:
        return {"status": "error", "message": "No autorizado"}, 403

    data = request.get_json()
    nuevo_geojson = data.get("geojson")
    nuevo_nombre = data.get("nombre")
    nueva_descripcion = data.get("descripcion")
    nueva_area = data.get("area")

    if not nuevo_geojson:
        return {"status": "error", "message": "GeoJSON faltante"}, 400

    parcela.perimetro_geojson = json.dumps(nuevo_geojson)
    parcela.area = nueva_area

    if nuevo_nombre:
        parcela.nombre = nuevo_nombre

    if nueva_descripcion:
        parcela.descripcion = nueva_descripcion

    db.session.commit()
    return {"status": "ok", "message": "Parcela actualizada correctamente"}

# --------------------------
# . Eliminar parcela
# --------------------------
@parcelas.route("/<int:parcela_id>/delete", methods=["DELETE"])
@login_required
def api_delete_parcela(parcela_id):
    parcela = Parcela.query.get_or_404(parcela_id)

    if parcela.campo.usuario_id != current_user.id:
        return jsonify({"status": "error", "message": "No autorizado"}), 403

    db.session.delete(parcela)
    db.session.commit()

    return jsonify({"status": "ok", "message": "Parcela eliminada correctamente"})

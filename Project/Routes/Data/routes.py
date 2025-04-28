from flask import Blueprint, render_template, request, jsonify
from sqlalchemy import desc
from flask_login import current_user
from sqlalchemy import func
from Project import db
from Project.models import Campo, Parcela, Animal, Collar, EventoSanitario, Alarma, Animal, Collar, Ubicacion, Temperatura, Acelerometro
import json

dashboard = Blueprint("dashboard", __name__, url_prefix="/dashboard")


@dashboard.route("/general")
def dashboard_general():
    # Simulación de usuario logueado (usar Flask-Login en producción)
    usuario_id = current_user.id
    
    # Filtro opcional por campo
    campo_id = request.args.get("campo_id", type=int)

    # --------------------------
    # 1. Campos del usuario
    # --------------------------
    campos_query = Campo.query.filter_by(usuario_id=usuario_id)
    campos = campos_query.all()

    # Si se aplicó filtro de campo:
    if campo_id:
        campos_query = campos_query.filter(Campo.id == campo_id)
        campos = campos_query.all()

    # --------------------------
    # 2. Parcelas + cantidad de animales
    # --------------------------
    parcelas_query = (
        db.session.query(Parcela, func.count(Animal.id).label("total_animales"))
        .outerjoin(Animal)
        .join(Campo)
        .filter(Campo.usuario_id == usuario_id)
    )

    if campo_id:
        parcelas_query = parcelas_query.filter(Parcela.campo_id == campo_id)

    parcelas = parcelas_query.group_by(Parcela.id).all()

    # --------------------------
    # 3. Collares
    # --------------------------
    collares_query = (
        db.session.query(Collar)
        .join(Animal)
        .join(Parcela)
        .join(Campo)
        .filter(Campo.usuario_id == usuario_id)
    )

    if campo_id:
        collares_query = collares_query.filter(Campo.id == campo_id)

    collares = collares_query.all()

    # --------------------------
    # 4. Últimos eventos sanitarios
    # --------------------------
    eventos_query = (
        db.session.query(EventoSanitario, Animal.nombre.label("animal_nombre"))
        .join(Animal)
        .join(Parcela)
        .join(Campo)
        .filter(Campo.usuario_id == usuario_id)
    )

    if campo_id:
        eventos_query = eventos_query.filter(Campo.id == campo_id)

    eventos = eventos_query.order_by(EventoSanitario.fecha.desc()).limit(10).all()

    # --------------------------
    # 5. Alertas abiertas
    # --------------------------
    alertas_query = (
        db.session.query(Alarma, Animal.nombre.label("animal_nombre"))
        .join(Animal)
        .join(Parcela)
        .join(Campo)
        .filter(Campo.usuario_id == usuario_id, Alarma.confirmada == False)
    )

    if campo_id:
        alertas_query = alertas_query.filter(Campo.id == campo_id)

    alertas = alertas_query.order_by(Alarma.fecha.desc()).all()

    # --------------------------
    # KPIs
    # --------------------------
    total_campos = len(campos)
    total_parcelas = len(parcelas)
    total_collares = len(collares)
    total_alertas_abiertas = len(alertas)

    parcelas_por_campo = {}
    for parcela in Parcela.query.filter(Parcela.campo_id.in_([c.id for c in campos_query])).all():
        try:
            geojson = json.loads(parcela.perimetro_geojson)
            geojson["id"] = parcela.id  # Agregamos el ID al GeoJSON
            campo_id = parcela.campo_id
            if campo_id not in parcelas_por_campo:
                parcelas_por_campo[campo_id] = []
            parcelas_por_campo[campo_id].append(geojson)
        except Exception:
            continue



    # --------------------------
    # Render Template
    # --------------------------
    return render_template(
        "data/dashboard_general.html",
        campos=campos,
        parcelas=parcelas,
        collares=collares,
        eventos=eventos,
        alertas=alertas,
        total_campos=total_campos,
        total_parcelas=total_parcelas,
        total_collares=total_collares,
        total_alertas=total_alertas_abiertas,
        campo_id_filtro=campo_id,
        parcelas_por_campo=parcelas_por_campo
    )

@dashboard.route('/data')
def datos_json():
    animales = Animal.query.all()
    resultado = []

    for animal in animales:
        collar = Collar.query.filter_by(animal_id=animal.id).first()
        if not collar:
            continue

        ubicacion = Ubicacion.query.filter_by(collar_id=collar.id).order_by(desc(Ubicacion.timestamp)).first()
        temperatura = Temperatura.query.filter_by(collar_id=collar.id).order_by(desc(Temperatura.timestamp)).first()
        acelerometro = Acelerometro.query.filter_by(collar_id=collar.id).order_by(desc(Acelerometro.timestamp)).first()

        resultado.append({
            "animal_id": animal.id,
            "nombre": animal.nombre,
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

@dashboard.route('/collares')
def collares():
    animales = Animal.query.all()
    datos = []

    for animal in animales:
        collar = Collar.query.filter_by(animal_id=animal.id).first()
        if not collar:
            continue

        ubicacion = Ubicacion.query.filter_by(collar_id=collar.id).order_by(desc(Ubicacion.timestamp)).first()
        temperatura = Temperatura.query.filter_by(collar_id=collar.id).order_by(desc(Temperatura.timestamp)).first()
        acelerometro = Acelerometro.query.filter_by(collar_id=collar.id).order_by(desc(Acelerometro.timestamp)).first()

        datos.append({
            "animal": animal,
            "collar": collar,
            "ubicacion": ubicacion,
            "temperatura": temperatura,
            "acelerometro": acelerometro
        })

    return render_template("data/realtime.html", datos=datos)

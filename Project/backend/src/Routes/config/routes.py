# /Project/backend/Routes/config/routes.py
from flask import Blueprint, render_template, redirect, url_for, request, flash, jsonify
from flask_login import current_user, login_required
from Project import db
from Project.models import Usuario, Persona, Campo, Parcela, Collar, Animal, Caracteristicas
from .forms import RegistroUsuarioForm, RegistroCampoForm, RegistroParcelaForm, RegistroCollarForm, RegistroAnimalForm, RegistroCaracteristicasForm
import json
from datetime import date

config = Blueprint("config", __name__, url_prefix="/config")


@config.route("/usuario", methods=["GET", "POST"])
@login_required
def usuario():
    form = RegistroUsuarioForm()

    if form.validate_on_submit():
        lat = request.form.get("lat")
        lon = request.form.get("lon")

        # Validar que se haya seleccionado el punto en el mapa
        if not lat or not lon:
            flash(
                "Debe seleccionar una ubicación en el mapa antes de continuar.",
                "danger",
            )
            return render_template("config/usuario.html", form=form)

        # Validar si ya existe ese email
        usuario_existente = Usuario.query.filter_by(username=form.username.data).first()
        if usuario_existente:
            flash("Ya existe un usuario con ese correo electrónico.", "danger")
            return render_template("config/usuario.html", form=form)

        # Validar si ya existe ese DNI
        persona_existente = Persona.query.filter_by(dni=form.dni.data).first()
        if persona_existente:
            flash("Ya existe una persona registrada con ese DNI.", "danger")
            return render_template("config/usuario.html", form=form)

        # Crear Usuario
        dueño = Usuario(
            username=form.username.data, password=form.password.data, id_tipousuario=2
        )
        db.session.add(dueño)
        db.session.commit()

        # Crear Persona
        persona = Persona(
            nombre=form.nombre.data,
            apellido=form.apellido.data,
            dni=form.dni.data,
            cumpleanios=form.cumpleanios.data,
            id=dueño.id,
        )
        db.session.add(persona)

        # Crear Campo
        campo = Campo(
            nombre=form.nombre_campo.data,
            descripcion=form.descripcion_campo.data,
            lat=float(lat),
            lon=float(lon),
            usuario_id=dueño.id,
            is_preferred=1,
        )
        db.session.add(campo)
        db.session.commit()

        flash("Dueño y campo creados con éxito.", "success")
        return redirect(url_for("Campos.crear_parcela"))

    return render_template("config/usuario.html", form=form)


#######################################

@config.route('/api/mapa/init')
@login_required
def api_mapa_init():
    campos = Campo.query.filter_by(usuario_id=current_user.id).all()
    parcelas = Parcela.query.join(Campo).filter(Campo.usuario_id == current_user.id).all()

    campos_serializados = [
        {
            "id": c.id,
            "nombre": c.nombre,
            "descripcion": c.descripcion,
            "lat": c.lat,
            "lon": c.lon,
            "is_preferred": c.is_preferred,
        }
        for c in campos
    ]

    parcelas_por_campo = {}
    for p in parcelas:
        geojson = json.loads(p.perimetro_geojson)
        geojson["id"] = p.id
        geojson["nombre"] = p.nombre
        geojson["descripcion"] = p.descripcion
        if p.campo_id not in parcelas_por_campo:
            parcelas_por_campo[p.campo_id] = []
        parcelas_por_campo[p.campo_id].append(geojson)

    return jsonify({
        "campos": campos_serializados,
        "parcelas": parcelas_por_campo
    })


#######################################

@config.route("/api/campos/init", methods=["GET"])
@login_required
def api_data_campo():
    campos_usuario = Campo.query.filter_by(usuario_id=current_user.id).all()
    campos_serializados = [
        {
            "id": c.id,
            "nombre": c.nombre,
            "descripcion": c.descripcion,
            "lat": c.lat,
            "lon": c.lon,
            "is_preferred": c.is_preferred
        }
        for c in campos_usuario
    ]
    return jsonify({"campos": campos_serializados})


@config.route("/api/campos/create", methods=["POST"])
@login_required
def api_create_campo():
    data = request.get_json()
    nombre = data.get("nombre")
    descripcion = data.get("descripcion")
    lat = data.get("lat")
    lon = data.get("lon")

    if not nombre or not descripcion or not lat or not lon:
        return jsonify({"status": "error", "message": "Faltan datos obligatorios"}), 400

    # Si no existen campos previos, este será el preferido
    campos_existentes = Campo.query.filter_by(usuario_id=current_user.id).count()
    nuevo = Campo(
        nombre=nombre,
        descripcion=descripcion,
        lat=float(lat),
        lon=float(lon),
        usuario_id=current_user.id,
        is_preferred=(campos_existentes == 0)
    )
    db.session.add(nuevo)
    db.session.commit()

    return jsonify({"status": "ok", "message": "Campo creado correctamente"})

@config.route("/api/campos/<int:campo_id>/update", methods=["POST"])
@login_required
def api_update_campo(campo_id):
    campo = Campo.query.get_or_404(campo_id)
    if campo.usuario_id != current_user.id:
        return jsonify({"status": "error", "message": "No autorizado"}), 403

    data = request.get_json()
    campo.nombre = data.get("nombre", campo.nombre)
    campo.descripcion = data.get("descripcion", campo.descripcion)
    campo.lat = float(data.get("lat", campo.lat))
    campo.lon = float(data.get("lon", campo.lon))

    db.session.commit()
    return jsonify({"status": "ok", "message": "Campo actualizado correctamente"})

@config.route("/api/campos/<int:campo_id>/delete", methods=["DELETE"])
@login_required
def api_delete_campo(campo_id):
    campo = Campo.query.get_or_404(campo_id)
    if campo.usuario_id != current_user.id:
        return jsonify({"status": "error", "message": "No autorizado"}), 403

    db.session.delete(campo)
    db.session.commit()

    return jsonify({"status": "ok", "message": "Campo eliminado correctamente"})


#######################################

@config.route('/api/parcelas/init')
@login_required
def api_data_parcela():
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


@config.route('/api/parcelas/create', methods=['POST'])
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

@config.route('/api/parcelas/<int:parcela_id>/update', methods=['POST'])
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

@config.route("/api/parcelas/<int:parcela_id>/delete", methods=["DELETE"])
@login_required
def api_delete_parcela(parcela_id):
    parcela = Parcela.query.get_or_404(parcela_id)

    if parcela.campo.usuario_id != current_user.id:
        return jsonify({"status": "error", "message": "No autorizado"}), 403

    db.session.delete(parcela)
    db.session.commit()

    return jsonify({"status": "ok", "message": "Parcela eliminada correctamente"})

from flask import Blueprint, render_template, redirect, url_for, request, flash
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


@config.route("/campo", methods=["GET", "POST"])
@login_required
def campo():
    form = RegistroCampoForm(prefix="campo")
    campos_usuario = Campo.query.filter_by(usuario_id=current_user.id).all()

    # Serializar campos existentes para JS
    campos_data = [
        {
            "id": c.id,
            "nombre": c.nombre,
            "descripcion": c.descripcion,
            "lat": c.lat,
            "lon": c.lon,
        }
        for c in campos_usuario
    ]

    if form.validate_on_submit():
        lat = request.form.get("lat")
        lon = request.form.get("lon")
        campo_id = request.form.get("campo_id")

        if not lat or not lon:
            flash("Debe seleccionar una ubicación en el mapa.", "danger")
            return render_template(
                "config/campo.html",
                form=form,
                campos_json=json.dumps(campos_data),
                center_lat=-38.0,
                center_lon=-63.0,
            )

        if campo_id:  # Actualizar campo
            campo = Campo.query.get(int(campo_id))
            if campo and campo.usuario_id == current_user.id:
                campo.nombre = form.nombre_campo.data
                campo.descripcion = form.descripcion_campo.data
                campo.lat = float(lat)
                campo.lon = float(lon)
                db.session.commit()
                flash("Campo actualizado correctamente.", "success")
        else:  # Crear nuevo
            nuevo = Campo(
                nombre=form.nombre_campo.data,
                descripcion=form.descripcion_campo.data,
                lat=float(lat),
                lon=float(lon),
                usuario_id=current_user.id,
            )
            db.session.add(nuevo)
            db.session.commit()
            flash("Campo creado correctamente.", "success")

        return redirect(url_for("config.campo"))

    # Centro inicial (último campo o valor default)
    campo_ini = campos_usuario[0] if campos_usuario else None
    center_lat = campo_ini.lat if campo_ini and campo_ini.lat else -38.0
    center_lon = campo_ini.lon if campo_ini and campo_ini.lon else -63.0

    return render_template(
        "config/campo.html",
        form=form,
        campos_json=json.dumps(campos_data),
        center_lat=center_lat,
        center_lon=center_lon,
    )

@config.route('/parcela', methods=['GET', 'POST'])
@login_required
def parcela():
    form = RegistroParcelaForm()
    campos_usuario = Campo.query.filter_by(usuario_id=current_user.id).all()
    form.campo_id.choices = [(c.id, c.nombre) for c in campos_usuario]

    if form.validate_on_submit():
        parcela_id = request.form.get("parcela_id")
        geojson = request.form.get("perimetro_geojson")

        if not form.campo_id.data:
            flash("Debe seleccionar un campo.", "danger")
            return redirect(url_for("config.parcela"))

        if not geojson:
            flash("Debe dibujar o editar el área de la parcela.", "danger")
            return redirect(url_for("config.parcela"))

        if parcela_id:  # 🟠 ACTUALIZAR PARCELA
            parcela = Parcela.query.get(int(parcela_id))
            if parcela and parcela.campo.usuario_id == current_user.id:
                parcela.nombre = form.nombre_parcela.data
                parcela.descripcion = form.descripcion_parcela.data
                parcela.perimetro_geojson = geojson
                db.session.commit()
                flash("Parcela actualizada correctamente.", "success")
        else:  # 🟢 CREAR NUEVA
            nueva = Parcela(
                nombre=form.nombre_parcela.data,
                descripcion=form.descripcion_parcela.data,
                perimetro_geojson=geojson,
                campo_id=form.campo_id.data,
            )
            db.session.add(nueva)
            db.session.commit()
            flash("Parcela creada correctamente.", "success")

        return redirect(url_for("config.parcela"))

    # Coordenadas iniciales
    campo_ini = campos_usuario[0] if campos_usuario else None
    center_lat = campo_ini.lat if campo_ini and campo_ini.lat else -38.0
    center_lon = campo_ini.lon if campo_ini and campo_ini.lon else -63.0

    # Diccionario: coordenadas por campo
    coordenadas_por_campo = {
        c.id: {"lat": c.lat, "lon": c.lon, "nombre": c.nombre} for c in campos_usuario if c.lat and c.lon
    }

    # Diccionario: parcelas por campo (geojson)
    parcelas_por_campo = {}
    for parcela in Parcela.query.filter(Parcela.campo_id.in_([c.id for c in campos_usuario])).all():
        try:
            geojson = json.loads(parcela.perimetro_geojson)
            geojson["id"] = parcela.id
            geojson["nombre"] = parcela.nombre
            geojson["descripcion"] = parcela.descripcion
            campo_id = parcela.campo_id
            if campo_id not in parcelas_por_campo:
                parcelas_por_campo[campo_id] = []
            parcelas_por_campo[campo_id].append(geojson)
        except Exception:
            continue

    return render_template(
        'config/parcela.html',
        form=form,
        center_lat=center_lat,
        center_lon=center_lon,
        coordenadas_por_campo=coordenadas_por_campo,
        parcelas_por_campo=parcelas_por_campo
    )

@config.route('/parcela/<int:parcela_id>/update', methods=['POST'])
@login_required
def update_parcela_geojson(parcela_id):
    parcela = Parcela.query.get_or_404(parcela_id)
    if parcela.campo.usuario_id != current_user.id:
        return {"status": "error", "message": "No autorizado"}, 403

    data = request.get_json()
    nuevo_geojson = data.get("geojson")

    if nuevo_geojson:
        parcela.perimetro_geojson = json.dumps(nuevo_geojson)
        db.session.commit()
        return {"status": "ok", "message": "Parcela actualizada"}
    
    return {"status": "error", "message": "GeoJSON faltante"}, 400

@config.route('/animal', methods=['GET', 'POST'])
@login_required
def animal():
    form_animal = RegistroAnimalForm(prefix="animal")
    form_animal.parcela_id.choices = [(p.id, p.nombre) for p in Parcela.query.all()]
    form_animal.collar_id.choices = [(c.id, c.codigo) for c in Collar.query.filter_by(animal_id=None).all()]

    if form_animal.submit.data and form_animal.validate_on_submit():
        caracteristicas = Caracteristicas()
        db.session.add(caracteristicas)
        db.session.commit()

        # Generar número de identificación incremental
        ultimo_animal = Animal.query.order_by(Animal.id.desc()).first()
        nuevo_id = 1 if not ultimo_animal else ultimo_animal.id + 1
        numero_identificacion = f"ID-{nuevo_id:03d}"

        nuevo_animal = Animal(
            nombre=form_animal.nombre.data,
            numero_identificacion=numero_identificacion,
            raza=form_animal.raza.data,
            sexo=form_animal.sexo.data,
            peso=form_animal.peso.data,
            altura_cruz=form_animal.altura_cruz.data,
            longitud_tronco=form_animal.longitud_tronco.data,
            perimetro_toracico=form_animal.perimetro_toracico.data,
            ancho_grupa=form_animal.ancho_grupa.data,
            longitud_grupa=form_animal.longitud_grupa.data,
            fecha_nacimiento=form_animal.fecha_nacimiento.data,
            estado_reproductivo=form_animal.estado_reproductivo.data,
            numero_partos=form_animal.numero_partos.data,
            intervalo_partos=form_animal.intervalo_partos.data,
            fertilidad=form_animal.fertilidad.data,
            ubicacion_sensor=form_animal.ubicacion_sensor.data,
            parcela_id=form_animal.parcela_id.data,
            caracteristicas_id=caracteristicas.id
        )
        db.session.add(nuevo_animal)
        db.session.commit()

        collar = Collar.query.get(form_animal.collar_id.data)
        collar.animal_id = nuevo_animal.id
        db.session.commit()

        flash("Animal creado y collar asignado", "success")
        return redirect(url_for('config.animal'))

    form_collar = RegistroCollarForm(prefix="collar")
    
    form_caracteristicas = RegistroCaracteristicasForm(prefix="caracteristicas")
    form_caracteristicas.animal_id.choices = [(a.id, f"{a.numero_identificacion} - {a.nombre}") for a in Animal.query.all()]
    
    return render_template(
        'config/collar_animal.html',
        form_animal=form_animal,
        form_collar=form_collar,
        form_caracteristicas=form_caracteristicas
    )

@config.route('/caracteristicas', methods=['POST'])
@login_required
def caracteristicas():
    form_caracteristicas = RegistroCaracteristicasForm(prefix="caracteristicas")
    animales = Animal.query.all()
    form_caracteristicas.animal_id.choices = [(a.id, f"{a.numero_identificacion} - {a.nombre}") for a in animales]

    if form_caracteristicas.validate_on_submit():
        animal = Animal.query.get(form_caracteristicas.animal_id.data)
        if not animal:
            flash("Animal no encontrado.", "danger")
            return redirect(url_for('config.animal'))

        caracteristicas = None
        if animal.caracteristicas_id:
            caracteristicas = Caracteristicas.query.get(animal.caracteristicas_id)

        if not caracteristicas:
            caracteristicas = Caracteristicas()
            db.session.add(caracteristicas)
            db.session.commit()
            animal.caracteristicas_id = caracteristicas.id

        campos = [
            "indice_corporal", "indice_toracico", "indice_cefalico", "perfil", "cabeza", "cuello",
            "grupa", "orejas", "ubre", "testiculos", "pelaje", "cuernos", "pezuñas", "mucosas",
            "bcs", "locomocion", "comportamiento"
        ]

        for campo in campos:
            setattr(caracteristicas, campo, getattr(form_caracteristicas, campo).data)

        db.session.commit()
        flash("Características morfológicas guardadas.", "success")
        return redirect(url_for('config.animal'))

    # Si falla, recargar todo con los datos necesarios
    form_animal = RegistroAnimalForm(prefix="animal")
    form_animal.parcela_id.choices = [(p.id, p.nombre) for p in Parcela.query.all()]
    form_animal.collar_id.choices = [(c.id, c.codigo) for c in Collar.query.filter_by(animal_id=None).all()]
    form_collar = RegistroCollarForm(prefix="collar")

    return render_template(
        'config/collar_animal.html',
        form_animal=form_animal,
        form_collar=form_collar,
        form_caracteristicas=form_caracteristicas,
        animales=animales
    )


@config.route('/collar', methods=['GET', 'POST'])
@login_required
def collar():
    form_collar = RegistroCollarForm(prefix="collar")

    if form_collar.validate_on_submit():
        cantidad = form_collar.cantidad_collares.data

        ultimo = db.session.query(Collar).order_by(Collar.id.desc()).first()
        nro_inicio = 1

        if ultimo and ultimo.codigo.startswith("COLLAR-"):
            try:
                nro_inicio = int(ultimo.codigo.split("-")[-1]) + 1
            except ValueError:
                pass

        for i in range(nro_inicio, nro_inicio + cantidad):
            nuevo_collar = Collar(
                codigo=f"COLLAR-{i:03d}",
                fecha_asignacion=date.today(),
                bateria=100,
                estado="activo",
            )
            db.session.add(nuevo_collar)
        db.session.commit()

        flash(f"{cantidad} {'collar creado existosamente' if cantidad == 1 else 'collares creados exitosamente'}.", "success")
        return redirect(url_for('config.collar'))

    form_caracteristicas = RegistroCaracteristicasForm(prefix="caracteristicas")
    form_caracteristicas.animal_id.choices = [(a.id, f"{a.numero_identificacion} - {a.nombre}") for a in Animal.query.all()]
    
    form_animal = RegistroAnimalForm(prefix="animal")
    form_animal.parcela_id.choices = [(p.id, p.nombre) for p in Parcela.query.all()]
    form_animal.collar_id.choices = [(c.id, c.codigo) for c in Collar.query.filter_by(animal_id=None).all()]

    return render_template(
        'config/collar_animal.html',
        form_animal=form_animal,
        form_collar=form_collar,
        form_caracteristicas=form_caracteristicas
    )

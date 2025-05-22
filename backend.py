# run.py
from Project import create_app, db
from database.scripts.function import load_data
import os

# Resolve the base directory of the script
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Initialize the app
app = create_app()

boolean = True

with app.app_context():
    db_uri = app.config["SQLALCHEMY_DATABASE_URI"]
    # Verifica que se esté usando SQLite
    if db_uri.startswith("sqlite:///"):
        # Crea todas las tablas definidas en los modelos
        db.create_all()
        if boolean:
            load_data()
    else:
        raise Exception("Unsupported database or incorrect URI (expected SQLite).")

if __name__ == "__main__":
    app.run(debug=True)
        

# Project/__init__.py
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager
from Project.config import Config

# Create an ORM connection to the database
db = SQLAlchemy()


# Create a login manager
login_manager = LoginManager()
login_manager.login_view = "login"
login_manager.login_message_category = "info"
login_manager.login_message = "Please, Sign Up"


def create_app(config_class=Config):
    app = Flask(__name__)  # flask app object
    app.config.from_object(Config)  # Configuring from Python Files
    db.init_app(app)  # Initializing the database
    login_manager.init_app(app)

    app.config["SECRET_KEY"] = "hfouewhfoiwefasdasdasdoquw"

    from Project.backend.Routes.home.routes import home
    from Project.backend.Routes.users.routes import users
    from Project.backend.Routes.config.routes import config
    from Project.backend.Routes.api_gateway.routes import api_gateway
    from Project.backend.Routes.data.routes import dashboard
    from Project.backend.Routes.errors.handlers import errors
    from Project.backend.Routes.static_files.routes import static_files


    app.register_blueprint(home)
    app.register_blueprint(users)
    app.register_blueprint(config)
    app.register_blueprint(dashboard)
    app.register_blueprint(errors)
    app.register_blueprint(api_gateway)
    app.register_blueprint(static_files)

    return app

# Project/access.py
from functools import wraps
from flask import abort
from flask_login import current_user, login_required

def admin_required(f):
    @login_required
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if current_user.id_tipousuario != 1:
            return abort(403)
        return f(*args, **kwargs)
    return decorated_function

def owner_required(f):
    @login_required
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if current_user.id_tipousuario != 2:
            return abort(403)
        return f(*args, **kwargs)
    return decorated_function

def employee_required(f):
    @login_required
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if current_user.id_tipousuario != 3:
            return abort(403)
        return f(*args, **kwargs)
    return decorated_function

# Project/config.py
import os

class Config:
    SECRET_KEY = "1246912zs0d13gh01c577f4dkj234a15"
    basedir = os.path.abspath(os.path.dirname(__file__))
    ROOT_DIR = os.path.dirname(basedir)

    DEBUG = True

    # Ruta al archivo SQLite
    sqlite_path = os.path.join(ROOT_DIR, 'database.sqlite')
    SQLALCHEMY_DATABASE_URI = f"sqlite:///{sqlite_path}"

    UPLOAD_FOLDER = os.path.join(ROOT_DIR, 'Project/static/images')
    SQLALCHEMY_TRACK_MODIFICATIONS = False

# Project/models.py
from sqlalchemy import (
    Column,
    String,
    Integer,
    Date,
    ForeignKey,
    Boolean,
    Float,
    DateTime,
    Text
)
from sqlalchemy.orm import relationship
from Project import db, login_manager
from flask_login import UserMixin
from flask import abort

from datetime import datetime

# Configuración de Flask-Login
@login_manager.user_loader
def user_loader(user_id):
    user = Usuario.query.filter_by(id=user_id).first()
    if user:
        return user
    return None


@login_manager.unauthorized_handler
def unauthorized_callback():
    abort(401)


class TipoUsuario(db.Model):
    __tablename__ = "tipo_usuario"
    id_tipousuario = Column(Integer, primary_key=True)
    tipousuario = Column(String(50), nullable=False)


class Usuario(UserMixin, db.Model):
    __tablename__ = "usuarios"
    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(100), nullable=False)
    attribute = Column(Boolean, nullable=False, default=True)
    password = Column(String(100), nullable=False)
    id_tipousuario = Column(Integer, ForeignKey("tipo_usuario.id_tipousuario"))
    tipousuario = relationship("TipoUsuario")

class Persona(db.Model):
    __tablename__ = "personas"
    id_persona = Column(Integer, primary_key=True, autoincrement=True)
    nombre = Column(String(50), nullable=False)
    apellido = Column(String(50), nullable=False)
    dni = Column(String(20), nullable=False)
    cumpleanios = Column(Date)
    id = Column(Integer, ForeignKey("usuarios.id"))
    usuario = relationship("Usuario")

class Animal(db.Model):
    __tablename__ = 'animales'
    id = Column(Integer, primary_key=True)
    nombre = Column(String(50), nullable=False)
    numero_identificacion = Column(String(50), unique=True)
    raza = Column(String(50))
    sexo = Column(String(10))
    fecha_nacimiento = Column(Date)
    
    # Zoometría
    peso = Column(Float)
    altura_cruz = Column(Float)
    longitud_tronco = Column(Float)
    perimetro_toracico = Column(Float)
    ancho_grupa = Column(Float)
    longitud_grupa = Column(Float)

    # Reproducción
    estado_reproductivo = Column(String(50))
    numero_partos = Column(Integer)
    intervalo_partos = Column(Integer)
    fertilidad = Column(Float)
    ubicacion_sensor = Column(String(100))
    
    # Relaciones
    parcela_id = Column(Integer, ForeignKey("parcelas.id"))
    caracteristicas_id = Column(Integer, ForeignKey('caracteristicas.id'))
    caracteristicas = relationship('Caracteristicas', backref='animal', uselist=False)

class Caracteristicas(db.Model):
    __tablename__ = 'caracteristicas'
    id = Column(Integer, primary_key=True)

    # Índices morfométricos
    indice_corporal = Column(Float)
    indice_toracico = Column(Float)
    indice_cefalico = Column(Float)

    # Morfología regional y fanerópticos
    perfil = Column(String(50))
    cabeza = Column(String(50))
    cuello = Column(String(50))
    grupa = Column(String(50))
    orejas = Column(String(50))
    ubre = Column(String(50))
    testiculos = Column(String(50))
    pelaje = Column(String(50))
    cuernos = Column(Boolean)
    pezuñas = Column(String(50))
    mucosas = Column(String(50))

    # Funcionalidad
    bcs = Column(Integer)
    locomocion = Column(String(50))
    comportamiento = Column(String(50))


class Collar(db.Model):
    __tablename__ = 'collares'
    id = Column(Integer, primary_key=True)
    codigo = Column(String(50), unique=True, nullable=False)
    fecha_asignacion = Column(Date)
    bateria = Column(Float)
    estado = Column(String(20))
    ultima_actividad = Column(DateTime)
    
    animal_id = Column(Integer, ForeignKey("animales.id"))


class AsignacionCollar(db.Model):
    id = Column(Integer, primary_key=True)
    collar_id = Column(Integer, ForeignKey('collares.id'))
    animal_id = Column(Integer, ForeignKey('animales.id'))
    fecha_inicio = Column(DateTime, nullable=False)
    fecha_fin = Column(DateTime)

    motivo_cambio = Column(String(100))
    usuario_id = Column(Integer, ForeignKey("usuarios.id"))


class NodoAutorizado(db.Model):
    __tablename__ = 'nodos_autorizados'
    id = Column(Integer, primary_key=True)
    collar_id = Column(Integer, ForeignKey('collares.id'), unique=True, nullable=False)

    client_id = Column(String(100), unique=True, nullable=False)  # identificador del nodo MQTT
    certificado_cn = Column(String(100), nullable=True)           # extraído del TLS mutual auth
    esta_autorizado = Column(Boolean, default=False)
    fecha_autorizacion = Column(DateTime, default=datetime.utcnow)

    usuario_id = Column(Integer, ForeignKey("usuarios.id"))  # quién lo autorizó
    observaciones = Column(Text)
    
    collar = relationship("Collar", backref="nodo_autorizado")
    usuario = relationship("Usuario")


class Ubicacion(db.Model):
    __tablename__ = 'ubicaciones'

    __table_args__ = (
        db.Index('idx_collar_timestamp', 'collar_id', 'timestamp'),
    )

    id = Column(Integer, primary_key=True)
    timestamp = Column(DateTime, index=True)
    lat = Column(Float)
    lon = Column(Float)

    collar_id = Column(Integer, ForeignKey('collares.id'), nullable=False)
    collar = relationship("Collar", backref="ubicaciones")


class UbicacionActual(db.Model):
    __tablename__ = 'ubicacion_actual'
    id = Column(Integer, primary_key=True)
    animal_id = Column(Integer, ForeignKey('animales.id'), unique=True)
    timestamp = Column(DateTime)
    lat = Column(Float)
    lon = Column(Float)


class Temperatura(db.Model):
    __tablename__ = 'temperaturas'
    id = Column(Integer, primary_key=True)
    timestamp = Column(DateTime)
    corporal = Column(Float)
    ambiente = Column(Float)

    collar_id = Column(Integer, ForeignKey('collares.id'))


class Acelerometro(db.Model):
    __tablename__ = 'aceleraciones'
    id = Column(Integer, primary_key=True)
    timestamp = Column(DateTime)
    x = Column(Float)
    y = Column(Float)
    z = Column(Float)

    collar_id = Column(Integer, ForeignKey('collares.id'))


class Parcela(db.Model):
    __tablename__ = 'parcelas'
    id = Column(Integer, primary_key=True)
    nombre = Column(String(100))
    descripcion = Column(String(200))
    perimetro_geojson = Column(Text)
    area = Column(Float)
    campo_id = Column(Integer, ForeignKey("campos.id"), nullable=False)
    animales = relationship('Animal', backref='parcela', lazy=True)


class Campo(db.Model):
    __tablename__ = 'campos'
    id = Column(Integer, primary_key=True)
    nombre = Column(String(100), nullable=False)
    descripcion = Column(String(200))
    lat = Column(Float)
    lon = Column(Float)
    is_preferred = Column(Boolean, default=False)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    parcelas = relationship('Parcela', backref='campo', lazy=True)


class EventoSanitario(db.Model):
    id = Column(Integer, primary_key=True)
    animal_id = Column(Integer, ForeignKey('animales.id'))
    fecha = Column(DateTime, nullable=False)
    tipo = Column(String(50))  # vacuna, tratamiento, enfermedad
    subtipo = Column(String(100))  # clostridiosis, mastitis, ivermectina...
    descripcion = Column(Text)

    via_administracion = Column(String(50))  # oral, subcutánea, etc.
    dosis = Column(Float)
    unidad_dosis = Column(String(10))  # ml, mg, etc.

    fecha_proxima_dosis = Column(Date)
    resultado = Column(String(100))  # mejorado, pendiente, muerto
    responsable = Column(String(100))
    usuario_id = Column(Integer, ForeignKey("usuarios.id"))



class ResumenAnimalDiario(db.Model):
    id = Column(Integer, primary_key=True)
    animal_id = Column(Integer, ForeignKey('animales.id'))
    fecha = Column(Date, index=True)
    
    temp_promedio = Column(Float)
    temp_max = Column(Float)
    temp_min = Column(Float)

    tiempo_activo = Column(Float)  # en minutos
    tiempo_inactivo = Column(Float)
    tiempo_rumiando = Column(Float)
    tiempo_dormido = Column(Float)

    distancia_recorrida = Column(Float)

    eventos_criticos = Column(Integer)
    alertas_generadas = Column(Integer)

    lat_promedio = Column(Float)
    lon_promedio = Column(Float)
    parcela_id = Column(Integer, ForeignKey('parcelas.id'))

    humedad_ambiente = Column(Float)
    temp_ambiente = Column(Float)


class Alarma(db.Model):
    id = Column(Integer, primary_key=True)
    animal_id = Column(Integer, ForeignKey('animales.id'))
    fecha = Column(DateTime, index=True)
    tipo = Column(String(50))  # "temperatura alta", "inactividad", etc.
    severidad = Column(String(20))  # crítica, media, leve
    valor_detectado = Column(Float)
    umbral = Column(Float)

    observacion = Column(Text)
    confirmada = Column(Boolean, default=False)
    fecha_confirmacion = Column(DateTime)
    usuario_confirmo_id = Column(Integer, ForeignKey('usuarios.id'))


class PreferenciaMapa(db.Model):
    __tablename__ = "preferencias_mapa"
    id = Column(Integer, primary_key=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), unique=True)

    lat_inicial = Column(Float, default=-38.4161)  # Argentina
    lon_inicial = Column(Float, default=-63.6167)
    zoom = Column(Integer, default=12)
    tipo_capa = Column(String(50), default="satellite")  # o "osm", etc.

    capa_parcelas = Column(Boolean, default=True)
    capa_animales = Column(Boolean, default=True)

    # opcional: límites del mapa
    bound_lat_min = Column(Float)
    bound_lat_max = Column(Float)
    bound_lon_min = Column(Float)
    bound_lon_max = Column(Float)

    usuario = relationship("Usuario", backref="preferencias_mapa")


# # # Futuro

# class RegistroAmbiental(db.Model):
#     id = Column(Integer, primary_key=True)
#     timestamp = Column(DateTime)
#     lat = Column(Float)
#     lon = Column(Float)
#     campo_id = Column(Integer, ForeignKey("campos.id"))

#     temperatura = Column(Float)
#     humedad = Column(Float)
#     velocidad_viento = Column(Float)
#     precipitacion = Column(Float)

# class DiagnosticoAutomatizado(db.Model):
#     id = Column(Integer, primary_key=True)
#     animal_id = Column(Integer, ForeignKey('animales.id'))
#     fecha = Column(DateTime)
#     probabilidad_enfermedad = Column(Float)
#     etiqueta_predicha = Column(String(100))  # "cojera", "fiebre"
#     modelo_version = Column(String(50))
#     observaciones = Column(Text)

<!-- Project/templates/index.html -->
<!DOCTYPE html>
<html lang="en">
    <head>
        <meta charset="UTF-8" />
        <title>Ganadería 4.0</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />

        {% if css_file %}
        <link rel="stylesheet" href="{{ url_for('static', filename='dist/' + css_file) }}">
        {% endif %}
    </head>
    <body>
        <div id="root"></div>

        <script type="module" crossorigin src="{{ url_for('static', filename='dist/' + js_file) }}"></script>
    </body>
</html>

<!-- Project/templates/users/login.html -->
{% include "base/layout.html" %}
{% include "base/navbar.html" %}
{% block onecontent %}
    <div class="container_config">
        <div class="content-section" style="display: flex; align-items: center; justify-content: center;">
            <form method="POST" action="" class="login-form">
                {{ form.hidden_tag() }}
                <div class="col-lg-12 table-wrapper down_shadow">
                    <fieldset class="form-group">
                        <div class="table-title">
                            <div class="row">
                                <div class="col-sm-8"><h2><b>Log In</b></h2></div>
                            </div>
                        </div>
                        <div class="form-group">
                            {{ form.username.label(class="form-control-label") }}
                            {% if form.username.errors %}
                                {{ form.username(class="form-control form-control-lg is-invalid") }}
                                <div class="invalid-feedback">
                                    {% for error in form.username.errors %}
                                        <span>{{ error }}</span>
                                    {% endfor %}
                                </div>
                            {% else %}
                                {{ form.username(class="form-control form-control-lg") }}
                            {% endif %}
                        </div>

                        <div class="form-group">
                            {{ form.password.label(class="form-control-label") }}
                            {% if form.password.errors %}
                                {{ form.password(class="form-control form-control-lg is-invalid") }}
                                <div class="invalid-feedback">
                                    {% for error in form.password.errors %}
                                        <span>{{ error }}</span>
                                    {% endfor %}
                                </div>
                            {% else %}
                                {{ form.password(class="form-control form-control-lg") }}
                            {% endif %}
                        </div>

                        <div class="form-check">
                            {{ form.remember(class="form-check-input") }}
                            {{ form.remember.label(class="form-check-label") }}
                        </div>

                    </fieldset>

                    <div class="form-group">
                        {{ form.submit(class="btn btn-outline-light") }}
                    </div>
                </div>
            </form>
        </div>
    </div>
{% endblock onecontent %}

<!-- Project/templates/errors/401.html -->
{% include "base/layout.html" %}
{% include "base/navbarError.html" %}
{% block onecontent %}
    <div class="content-section" style="padding:50px;">
        <h1>Something went wrong (401)</h1>
        <p>Oops, you're not logged in. Try it after login!</p>
    </div>
{% endblock onecontent %}

<!-- Project/templates/errors/403.html -->
{% include "base/layout.html" %}
{% include "base/navbarError.html" %}
{% block onecontent %}
    <div class="content-section" style="padding:50px;">
        <h1>You don't have permission to do that (403)</h1>
        <p>Please check your account and try again</p>
    </div>
{% endblock onecontent %}

<!-- Project/templates/errors/404.html -->
{% include "base/layout.html" %}
{% include "base/navbarError.html" %}
{% block onecontent %}
    <div class="content-section" style="padding:50px;">
        <h1>Oops. Page Not Found (404)</h1>
        <p>That page does not exist. Please try a different location</p>
    </div>
{% endblock onecontent %}

<!-- Project/templates/errors/500.html -->
{% include "base/layout.html" %}
{% include "base/navbarError.html" %}
{% block onecontent %}
    <div class="content-section" style="padding:50px;">
        <h1>Something went wrong (500)</h1>
        <p>We're experiencing some trouble on our end. Please try again in the near future</p>
    </div>
{% endblock onecontent %}

<!-- Project/templates/errors/501.html -->
{% include "base/layout.html" %}
{% include "base/navbarError.html" %}
{% block onecontent %}
    <div class="content-section" style="padding:50px;">
        <h1>Code time has expired (501)</h1>
        <p>The token you have requested has exceeded 5 minutes of expiration</p>
    </div>
{% endblock onecontent %}

<!-- Project/templates/base/layout.html -->
<html lang="es">
    <head>
        <title>Ganadería 4.0 | UB</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
        <meta name="description" content="Tesina Gianluca Zinni - UB">
        <meta name="theme-color" content="#999999" /> 

        <title>Tesina - Zinni Gianluca</title>
        <link rel="stylesheet" href="/static/css/main.css">
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.2.0/css/all.min.css">
        <script type="text/javascript" src="https://ajax.googleapis.com/ajax/libs/jquery/3.6.0/jquery.min.js"></script>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.2.2/dist/css/bootstrap.min.css" integrity="sha384-Zenh87qX5JnK2Jl0vWa8Ck2rdkQ2Bzep5IDxbcnCeuOxjzrPF/et3URy9Bv1WTRi" crossorigin="anonymous">
        <script type="text/javascript" src="https://cdn.jsdelivr.net/npm/bootstrap@5.2.2/dist/js/bootstrap.min.js" integrity="sha384-IDwe1+LCz02ROU9k972gdyvl+AESN10+x7tBKgc9I5HFtuNz0wWnPclzo6p9vxnk" crossorigin="anonymous"></script>
        <script type="text/javascript" src="https://cdn.jsdelivr.net/npm/bootstrap@5.2.2/dist/js/bootstrap.bundle.min.js" integrity="sha384-OERcA2EqjJCMA+/3y+gxIOqMEjwtxJY7qPCqsdltbNJuaOe923+mo//f6V8Qbsw3" crossorigin="anonymous"></script>
        <link rel="stylesheet" type="text/css" href="https://cdn.datatables.net/v/bs5/jq-3.6.0/dt-1.12.1/b-2.2.3/b-colvis-2.2.3/b-html5-2.2.3/fc-4.1.0/r-2.3.0/sl-1.4.0/datatables.min.css"/>
        <script type="text/javascript" src="https://cdn.datatables.net/v/bs5/jq-3.6.0/dt-1.12.1/b-2.2.3/b-colvis-2.2.3/b-html5-2.2.3/fc-4.1.0/r-2.3.0/sl-1.4.0/datatables.min.js"></script>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/popper.js/1.12.3/umd/popper.min.js" integrity="sha384-vFJXuSJphROIrBnz7yo7oB41mKfc8JzQZiCq4NCceLEaO4IHwicKwpJf9c9IpFgh" crossorigin="anonymous"></script>
        <script src="https://maxcdn.bootstrapcdn.com/bootstrap/4.0.0-beta.2/js/bootstrap.min.js" integrity="sha384-alpBpkh1PFOepccYVYDB4do5UnbKysX5WZXm3XxPqe5iKTfUKjNkCk9SaVuEZflJ" crossorigin="anonymous"></script>
        
        <link rel="stylesheet" href="/static/css/gestion.css">
        <link rel="stylesheet" href="/static/css/tablas-global.css">
        <link rel="stylesheet" href="/static/css/home.css">
        <link rel="stylesheet" href="/static/css/footer.css">

        <script type="text/javascript" src="/static/javascript/admin.js"></script>
        <script type="text/javascript" src="/static/javascript/mobile.js"></script>
        <script type="text/javascript" src="/static/javascript/tables-global.js"></script>
        <script type="text/javascript" src="/static/javascript/home.js"></script>
        <script type="text/javascript" src="/static/javascript/pedidos_productos_clientes.js"></script>
        <script type="text/javascript" src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.1.3/jszip.min.js"></script>

        <!-- SWIPERS -->
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swiper/swiper-bundle.min.css"/>
        <script src="https://cdn.jsdelivr.net/npm/swiper/swiper-bundle.min.js"></script>

        <!-- Chart.JS -->
        <script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.7.1/chart.min.js"></script>

        <link rel="shortcut icon" href="/static/icon/favicon.ico">
    </head>

    <script type="text/javascript">
        $(window).on("load",function(){
            $(".loader-wrapper").fadeOut("slow");
        });
        $(document).ready(function(){
            $("#all_messages").delay(3000).fadeOut(1000)
        });
    </script>

    <div class="loader-wrapper">
        <span class="loader"></span>
    </div>

    <body>
        <main role="main" class="container-base">
            {% block onecontent %} 
            {% endblock %}
            <div id="all_messages">
                {% with messages = get_flashed_messages(with_categories=true) %}
                {% if messages %} 
                    {% for category, message in messages %}
                    <div id="flash_messages" class="flash_messages alert alert-{{ category }}">
                        {{ message }}
                    </div>
                    {% endfor %}
                {% endif %}
                {% endwith %}
            </div>
        </main>
    </body>

</html>

<!-- Project/templates/base/home.html -->
{% include "base/layout.html" %}
{% include "base/navbar.html" %}
{% block onecontent %}

    <div class="container_config">
        <div class="content-section" style="display: flex; align-items: center; justify-content: center;">
            <div class="table-wrapper down_shadow">
                <div class="row">
                    <div class="col-sm-12"><h2>Gestión de <b>Recursos</b></h2></div>
                </div>
                <div>
                    <button onclick="window.location.href='{{ url_for('home.default') }}';" type="button" class="del_upd_add_button btn btn-sm" style="width: 100%; border-radius: 10px !important; height: fit-content;">
                        Ver Mapa <i class="fa-solid fa-solid fa-map-marked-alt" style="font-size:25px"></i>
                    </button>
                    <button onclick="window.location.href='{{ url_for('config.campo') }}';" type="button" class="del_upd_add_button btn btn-sm" style="width: 100%; border-radius: 10px !important; height: fit-content;">
                        Configurar Campos <i class="fa-solid fa-map-pin" style="font-size:25px"></i>
                    </button>
                    <button onclick="window.location.href='{{ url_for('config.parcela') }}';" type="button" class="del_upd_add_button btn btn-sm" style="width: 100%; border-radius: 10px !important; height: fit-content;">
                        Configurar Parcelas <i class="fa-solid fa-map-signs" style="font-size:25px"></i>
                    </button>
                    <button onclick="window.location.href='{{ url_for('config.animal') }}';" type="button" class="del_upd_add_button btn btn-sm" style="width: 100%; border-radius: 10px !important; height: fit-content;">
                        Cargar Animales <i class="fa-solid fa-cow" style="font-size:25px"></i>
                    </button>
                </div>
            </div>
        </div>
    </div>

{% endblock onecontent %}

<!-- Project/templates/base/navbar.html -->
<style>
    .searchBox {
        background: #525252;
        height: 45px;
        border-radius: 40px;
        z-index: 5000;
        position:absolute;
        right: 210;
        margin-top: 7px;
        width:250px;
    }

    .searchButton {
        color: white;
        float: right;
        width: 45px;
        height: 45px;
        border-radius: 50%;
        border-color: white;
        background:#363535;
        display: flex;
        justify-content: center;
        align-items: center;
        transition: 0.6s;
    }
    
    .searchInput {
        border:none;
        background: none;
        outline:none;
        float:left;
        padding: 2 10px;
        margin-left:5px;
        color: white !important;
        font-size: 16px;
        transition: 0.6s;
        line-height: 40px;
        width: 190px;
        webkit-box-shadow: #0000;
    
    }

    input[type=search] {
        color:white;
    }

    input:-webkit-autofill, input:-webkit-autofill:hover, input:-webkit-autofill:focus, textarea:-webkit-autofill, textarea:-webkit-autofill:hover, textarea:-webkit-autofill:focus, select:-webkit-autofill, select:-webkit-autofill:hover, select:-webkit-autofill:focus {
        -webkit-text-fill-color: #FAFAFA;
        -webkit-box-shadow: 0 0 0px 1000px #00000000 inset;
        transition: background-color 5000s ease-in-out 0s;
    }
    
</style>
    {% if current_user.is_authenticated %}
        <header style="text-align: center;" class="down_shadow">
            <a style="position:absolute;" class="logo" href="{{ url_for('home.home_route') }}">
                <img class="logo-img" src="/static/images/Universidad_de_Belgrano.png">
            </a>

            </div>
            <a href="{{ url_for('users.logout') }}" class="down_shadow cta" style="position:absolute; right:20;"><i class="fa-solid fa-up-right-from-square"></i></a>
            <div class="btn-group" style="position:absolute; right:5">
                <button onclick="openSideUser()" class="menu cta down_shadow" style="width:50px;" type="button">
                    <i class="fa-solid fa-bars"></i>
                </button>
            </div>
        </header>

    {% else %}

        <header style="text-align: center;" class="down_shadow">
            <a class="logo" href="{{ url_for('users.login') }}">
                <img class="logo-img" src="/static/images/Universidad_de_Belgrano.png">
            </a>
        </header>
        
    {% endif %}

    <div id="overlayUser" class="overlay">
        <a class="close" onclick="closeSideUser()">&times;</a>
        <div class="overlay__content">
            <a href="{{ url_for('home.home_route') }}"><i class="fa-solid fa-house"></i> <b> Home </b></a>
            <a href="{{ url_for('users.logout') }}"><i class="fa-solid fa-up-right-from-square"></i> <b> Log Out </b></a>
        </div>
    </div>

<!-- Project/templates/base/navbarError.html -->
{% if current_user.is_authenticated %}
    <header style="text-align: center;" class="down_shadow">
        <div style="display:flex">
            <a class="logo" href="{{ url_for('home.home_route') }}">
                <img class="logo-img" src="/static/images/Universidad_de_Belgrano.png">
            </a>
        </div>
        <ul class="nav__links_home" style="top:5px;">
            <li class="nav-item"><a href="{{ url_for('home.home_route') }}" class="nav-link">Volver al Inicio</a></li>
        </ul>
    </header>

    {% else %}

        <header style="text-align: center;" class="down_shadow">
            <div style="display:flex">
                <a class="logo" href="{{ url_for('users.login') }}">
                    <img class="logo-img" src="/static/images/Universidad_de_Belgrano.png">
                </a>
            </div>
            <ul class="nav__links_home" style="top:5px;">
                <li class="nav-item"><a href="{{ url_for('users.login') }}" class="nav-link">Volver al Inicio</a></li>
            </ul>
        </header>
        
    {% endif %}

<!-- Project/templates/base/footer.html -->
<button id="open-button" class="chat-button down_shadow" onclick="openChat()"><i class="fa-solid fa-comments" style="font-size:20px;"></i></button>
<button id="close-button" class="chat-button down_shadow" onclick="closeChat()" style="display:none;"><i class="fa-solid fa-xmark" style="font-size:30px;"></i></button>

<div class="chat-popup" id="PopUpChat">
    <div class="form-container">
        <h2 style="text-align:center">Enviar un mail</h2>
        <label for="tittle"><b>Cabecera</b></label>
        <textarea  id="cabeceraMensaje" maxlength="60" style="min-height: 40px; height: 55px; margin-bottom: 5px;" placeholder="Título.." name="tittle" required></textarea>
        <label for="msg"><b>Cuerpo</b></label>
        <textarea id="cuerpoMensaje" maxlength="1000" placeholder="Escribe un mensaje.." name="msg" required></textarea>
        <button class="botones-chat" id="EnviarMailConsulta">Enviar</button>

        <div style="display:flex;">
        <form style="width:100%; font-size:25px;" target="_blank" action="https://wa.me/541139144762?text=Buenas%20tardes%20Dimac!%2C%20Tengo%20una%20consulta">
            <button class="botones-chat"><i class="fa-brands fa-whatsapp"></i></button>
        </form>
        <!--form style="width:50%; font-size:25px;"  target="_blank" action="https://www.facebook.com/profile.php?id=100085301799143">
            <button class="botones-chat"><i class="fa-brands fa-facebook"></i></button>
        </form-->
        </div>
    </div>
</div>

<button id="go-up-button" class="go-up-button down_shadow" onclick="GoUpFunction()" style="display:none;"><i class="fa-solid fa-arrow-up-long" style="font-size:30px;"></i></button>

<footer>
    <div class="content">
        <div class="left box">
            <div class="upper">
                <div class="topic">Sobre nosotros</div>
                <p>Somos una compañia lider en producción y venta de <b style="color:#00000000">metanfetamina. </b></p>
            </div>
            <div class="lower">
                <div class="topic">Contacto</div>
                    <div class="phone">
                        <a href="https://wa.me/+5491139144762?text=Hola!%20Tengo%20una%20consulta%20a%20cerca,%20de%20Dimac%20Bater%C3%ADas,%20Podr%C3%ADas%20asesorarme?%20">
                            <i class="fas fa-phone-volume"></i>+54 9 11 3914-4762</a>
                    </div>
                    <div class="email">
                        <a href="https://mail.google.com/mail/?view=cm&fs=1&to=sebastian.portillo@comunidad.ub.edu.ar"><i class="fas fa-envelope"></i>baterias@dimac.com</a>
                    </div>
                    <div class="email">
                        <a href="https://goo.gl/maps/883hhXky587st1dy5"><i class="fa-solid fa-location-arrow"></i>Gdor. Valentín Vergara 2618, B1602 Florida, Bs. As.</a>
                    </div>
                </div>
            </div>
            <div class="middle box">
                <div class="topic">Navegación</div>
                <div><a class="texto-navegacion" href="{{ url_for('home.home_route', id=0, page=1) }}"> Pedido </a></div>
                <div><a class="texto-navegacion" href="{{ url_for('Home.historialPedidos') }}"> Historial </a></div>
                <div><a class="texto-navegacion" href="{{ url_for('Users.account') }}"> Cuenta </a></div>
                <div><a class="texto-navegacion" href="{{ url_for('users.logout') }}"></i> Log Out </a></div>
            </div>
            <div class="right box">
                <div class="topic">Medios de pago</div>
                    <div>
                        <img class="img-fluid" style="width:400px;" src="/static/recursos-img/mediosdepago.png">
                    </div>
                </div>
            </div>
        <div class="bottom">
        <p>Copyright © 2022 <a href="#">DIMAC</a> All rights reserved</p>
        </div>
</footer>

<script type="text/javascript" src="/static/javascript/footer.js"></script>

# /Project/backend/Routes/users/routes.py
from flask import render_template, url_for, redirect, Blueprint
from flask_login import current_user, logout_user
from Project.backend.Routes.users.forms import LoginForm
from Project.backend.Routes.users.controllerUser.controller import Login

users = Blueprint('users', __name__)

@users.route("/")
@users.route("/login", methods=['GET', 'POST'])
def login():
    form = LoginForm()
    if current_user.is_authenticated:
        if current_user.id_tipousuario == 2 or current_user.id_tipousuario == 3:
            return redirect(url_for('UsuarioGestion.admin'))
        return redirect(url_for("home.home_route"))
    
    if form.validate_on_submit():
        Login(form)
        return redirect(url_for('users.login'))
    return render_template('users/login.html', title='Login', form=form)


@users.route("/logout")
def logout():
    logout_user()
    return redirect(url_for('users.login'))

# /Project/backend/Routes/users/forms.py
from flask_wtf import FlaskForm
from wtforms import StringField, PasswordField, SubmitField, BooleanField
from wtforms.validators import DataRequired

class LoginForm(FlaskForm):
    username = StringField('Correo',
                        validators=[DataRequired()])
    password = PasswordField('Password', validators=[DataRequired()])
    remember = BooleanField('Recuérdame')
    submit = SubmitField('Ingresar')

# /Project/backend/Routes/static_files/routes.py
from flask import Blueprint, current_app, send_from_directory
import os

static_files = Blueprint('static_files', __name__)

@static_files.route('/dist/<path:filename>')
def serve_dist_file(filename):
    return send_from_directory(os.path.join(current_app.root_path, 'static', 'dist'), filename)

# /Project/backend/Routes/home/routes.py
from flask import Blueprint, render_template, current_app, url_for, redirect
from Project.access import admin_required
import json

home = Blueprint("home", __name__)


@home.route("/")
def empty_route():
    return redirect(url_for("users.login"))


@home.route("/mapa")
def default():
    # Ruta absoluta del manifest generado por Vite
    manifest_path = current_app.root_path + "\static\dist\.vite\manifest.json"

    with open(manifest_path) as f:
        manifest = json.load(f)
        # accedemos a los archivos principales
        js_file = manifest["index.html"]["file"]
        css_file = manifest["index.html"].get("css", [None])[0]  # puede no tener

    return render_template("index.html", js_file=js_file, css_file=css_file)


@home.route("/campos")
@home.route("/parcelas")
def react():
    # Ruta absoluta del manifest generado por Vite
    manifest_path = current_app.root_path + "\static\dist\.vite\manifest.json"

    with open(manifest_path) as f:
        manifest = json.load(f)
        # accedemos a los archivos principales
        js_file = manifest["index.html"]["file"]
        css_file = manifest["index.html"].get("css", [None])[0]  # puede no tener

    return render_template("index.html", js_file=js_file, css_file=css_file)


@home.route("/home", methods=["GET", "POST"])
@admin_required
def home_route():
    return render_template("base/home.html")

# /Project/backend/Routes/errores/handlers.py
from flask import Blueprint, render_template

errors = Blueprint('errors', __name__)

"""
En esta hoja se encuentran los handler con redireccionamiento a templates de error.
"""


"""
Error 404 - Not Found
la URL a la que está intentando acceder no existe. 
"""
@errors.app_errorhandler(404)
def error_404(error):
    return render_template('errors/404.html'), 404


"""
Error 403 - Forbidden 
significa que se a intentado acceder a una pagina o recurso del cual
el usuario no tiene acceso.
"""
@errors.app_errorhandler(403)
def error_403(error):
    return render_template('errors/403.html'), 403


"""
Error 500 - Internal server error 
significa que ha sucedido un error al intentar acceder al servidor, 
pero no se puede dar mas detalles sobre lo que ha ocurrido.
"""
@errors.app_errorhandler(500)
def error_500(error):
    return render_template('errors/500.html'), 500

""" 
Error 401 - Unauthorized
el servidor ha podido ser contactado, y ha recibido una petición válida, 
pero ha denegado el acceso a la acción que se solicita.
"""
@errors.app_errorhandler(401)
def error_401(error):
    return render_template('errors/401.html'), 401

""" 
Error 501 - Code Expired
el request reset password token ha vencido
"""
@errors.app_errorhandler(501)
def error_501(error):
    return render_template('errors/501.html'), 501

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

# /Project/backend/Routes/config/forms.py
from flask_wtf import FlaskForm
from wtforms import (
    StringField,
    PasswordField,
    SubmitField,
    DateField,
    SelectField,
    TextAreaField,
    IntegerField,
    FloatField,
    BooleanField,
)
from wtforms.validators import (
    DataRequired,
    Length,
    Email,
    Regexp,
    NumberRange,
    Optional,
)


class RegistroUsuarioForm(FlaskForm):
    # Usuario
    username = StringField(
        "Email",
        validators=[DataRequired(), Email(message="Debe ingresar un correo válido")],
    )
    password = PasswordField("Contraseña", validators=[DataRequired()])

    # Persona
    nombre = StringField(
        "Nombre",
        validators=[
            DataRequired(),
            Length(min=3, message="El nombre debe tener al menos 3 letras"),
            Regexp(r"^[A-Za-zÀ-ÿ\s]+$", message="Solo se permiten letras y espacios"),
        ],
    )
    apellido = StringField(
        "Apellido",
        validators=[
            DataRequired(),
            Length(min=3, message="El apellido debe tener al menos 3 letras"),
            Regexp(r"^[A-Za-zÀ-ÿ\s]+$", message="Solo se permiten letras y espacios"),
        ],
    )

    dni = StringField(
        "DNI",
        validators=[
            DataRequired(),
            Regexp(
                r"^\d{8,}$", message="El DNI debe tener al menos 8 dígitos numéricos"
            ),
        ],
    )

    cumpleanios = DateField(
        "Cumpleaños", format="%Y-%m-%d", validators=[DataRequired()]
    )

    # Campo
    nombre_campo = StringField(
        "Nombre del campo",
        validators=[
            DataRequired(),
            Length(min=3, message="El nombre del campo debe tener al menos 3 letras"),
        ],
    )

    descripcion_campo = StringField(
        "Descripción del campo",
        validators=[
            Length(
                max=100, message="La descripción no puede exceder los 100 caracteres"
            ),
        ],
    )

    submit = SubmitField("Registrar")


class RegistroCampoForm(FlaskForm):
    # Campo
    nombre_campo = StringField(
        "Nombre del campo",
        validators=[
            DataRequired(),
            Length(min=3, message="El nombre del campo debe tener al menos 3 letras"),
        ],
    )

    descripcion_campo = StringField(
        "Descripción del campo",
        validators=[
            Length(
                max=100, message="La descripción no puede exceder los 100 caracteres"
            ),
        ],
    )

    submit = SubmitField("Registrar")


class RegistroParcelaForm(FlaskForm):
    nombre_parcela = StringField(
        "Nombre del Área",
        validators=[
            DataRequired(),
            Length(min=3, message="El nombre del campo debe tener al menos 3 letras"),
        ],
    )
    descripcion_parcela = StringField(
        "Descripción de la parcela",
        validators=[
            Length(
                max=100, message="La descripción no puede exceder los 100 caracteres"
            ),
        ],
    )
    campo_id = SelectField(
        "Campo",
        validators=[DataRequired()],
        choices=[("default", "Seleccione un Campo")],
    )
    perimetro_geojson = TextAreaField("GeoJSON", validators=[DataRequired()])
    submit = SubmitField("Crear Parcela")


class RegistroCollarForm(FlaskForm):
    cantidad_collares = IntegerField(
        "Cantidad de collares",
        validators=[
            NumberRange(min=1, max=50, message="Cantidad inválida (1 a 50)"),
            DataRequired(),
        ],
    )
    submit = SubmitField("Cargar Collares")


class RegistroAnimalForm(FlaskForm):
    # Identificación básica
    nombre = StringField(
        "Nombre",
        validators=[
            DataRequired(message="Este campo es obligatorio."),
            Length(min=3, message="El nombre debe tener al menos 3 letras."),
            Regexp(r"^[A-Za-zÀ-ÿ\s]+$", message="Solo se permiten letras y espacios."),
        ],
    )
    raza = SelectField(
        "Raza",
        choices=[
            ("Angus", "Angus"),
            ("Hereford", "Hereford"),
            ("Brangus", "Brangus"),
            ("Brahman", "Brahman"),
            ("Braford", "Braford"),
            ("Limousin", "Limousin"),
            ("Criollo", "Criollo"),
        ],
        validators=[
            DataRequired(message="Seleccione la raza del animal."),
            Length(min=2, message="La raza debe tener al menos 2 caracteres."),
        ],
    )
    sexo = SelectField(
        "Sexo",
        choices=[("Macho", "Macho"), ("Hembra", "Hembra")],
        validators=[DataRequired(message="Seleccione el sexo del animal.")],
    )
    fecha_nacimiento = DateField(
        "Fecha de Nacimiento",
        format="%Y-%m-%d",
        validators=[DataRequired("Seleccione el nacimiento del animal.")],
    )

    # Zoometría
    peso = FloatField(
        "Peso (kg)",
        validators=[
            DataRequired("Seleccione el peso del animal."),
            NumberRange(min=0, message="El peso debe ser positivo."),
        ],
    )
    altura_cruz = FloatField(
        "Altura a la cruz (cm)", validators=[Optional(), NumberRange(min=0)]
    )
    longitud_tronco = FloatField(
        "Longitud del tronco (cm)", validators=[Optional(), NumberRange(min=0)]
    )
    perimetro_toracico = FloatField(
        "Perímetro torácico (cm)", validators=[Optional(), NumberRange(min=0)]
    )
    ancho_grupa = FloatField(
        "Ancho de grupa (cm)", validators=[Optional(), NumberRange(min=0)]
    )
    longitud_grupa = FloatField(
        "Longitud de grupa (cm)", validators=[Optional(), NumberRange(min=0)]
    )

    # Reproducción
    estado_reproductivo = SelectField(
        "Estado Reproductivo",
        choices=[("Preñada", "Preñada"), ("Vacía", "Vacía"), ("Activo", "Activo")],
        validators=[DataRequired()],
    )
    numero_partos = IntegerField(
        "Número de Partos", validators=[Optional(), NumberRange(min=0)]
    )
    intervalo_partos = IntegerField(
        "Intervalo entre partos (días)", validators=[Optional(), NumberRange(min=0)]
    )
    fertilidad = FloatField(
        "Fertilidad (%)", validators=[Optional(), NumberRange(min=0, max=100)]
    )
    ubicacion_sensor = SelectField(
        "Ubicación anatómica del sensor",
        choices=[("Cuello", "Cuello"), ("Muñeca", "Muñeca")],
        validators=[DataRequired(message="Seleccione la ubicación del sensor.")],
    )

    # Relacionales
    parcela_id = SelectField(
        "Parcela",
        coerce=int,
        validators=[DataRequired(message="Seleccione una parcela.")],
    )
    collar_id = SelectField(
        "Collar", coerce=int, validators=[DataRequired(message="Seleccione un collar.")]
    )

    submit = SubmitField("Registrar Animal")


class RegistroCaracteristicasForm(FlaskForm):
    # Índices
    indice_corporal = FloatField("Índice Corporal", validators=[Optional(), NumberRange(min=0)])
    indice_toracico = FloatField("Índice Torácico", validators=[Optional(), NumberRange(min=0)])
    indice_cefalico = FloatField("Índice Cefálico", validators=[Optional(), NumberRange(min=0)])

    # Morfología
    perfil = StringField("Perfil", validators=[Optional(), Length(min=2), Regexp(r'^[\w\sáéíóúÁÉÍÓÚñÑ.,-]*$', message="Solo letras, números y signos básicos")])
    cabeza = StringField("Cabeza", validators=[Optional(), Length(min=2)])
    cuello = StringField("Cuello", validators=[Optional(), Length(min=2)])
    grupa = StringField("Grupa", validators=[Optional(), Length(min=2)])
    orejas = StringField("Orejas", validators=[Optional(), Length(min=2)])
    ubre = StringField("Ubre / Pezones", validators=[Optional(), Length(min=2)])
    testiculos = StringField("Testículos", validators=[Optional(), Length(min=2)])
    pelaje = StringField("Tipo y color de pelaje", validators=[Optional(), Length(min=2)])
    cuernos = BooleanField("¿Tiene cuernos?")
    pezuñas = StringField("Pezuñas", validators=[Optional(), Length(min=2)])
    mucosas = StringField("Color de mucosas / ojos", validators=[Optional(), Length(min=2)])

    # Funcionalidad
    bcs = IntegerField("Condición corporal (1-5)", validators=[Optional(), NumberRange(min=1, max=5)])
    locomocion = StringField("Locomoción", validators=[Optional(), Length(min=2)])
    comportamiento = StringField("Comportamiento", validators=[Optional(), Length(min=2)])

    # Selector de animal relacionado
    animal_id = SelectField("Seleccionar Animal", coerce=int, validators=[Optional()])

    submit = SubmitField("Guardar características")
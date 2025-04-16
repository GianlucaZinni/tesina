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

# ~/Project/models.py
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
    __tablename__ = "tipos_usuarios"
    id_tipousuario = Column(Integer, primary_key=True)
    tipousuario = Column(String(50), nullable=False)

class Usuario(UserMixin, db.Model):
    __tablename__ = "usuarios"
    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(100), nullable=False)
    attribute = Column(Boolean, nullable=False, default=True)
    password = Column(String(100), nullable=False)
    id_tipousuario = Column(Integer, ForeignKey("tipos_usuarios.id_tipousuario"))
    tipousuario = relationship("TipoUsuario")
    campos = relationship('Campo', backref='usuario', lazy=True)
    asignaciones_realizadas = relationship("AsignacionCollar", backref="usuario_asignador", lazy=True) 

class Persona(db.Model):
    __tablename__ = "personas"
    id_persona = Column(Integer, primary_key=True, autoincrement=True)
    nombre = Column(String(50), nullable=False)
    apellido = Column(String(50), nullable=False)
    dni = Column(String(20), nullable=False)
    cumpleanios = Column(Date)
    id = Column(Integer, ForeignKey("usuarios.id"))
    usuario = relationship("Usuario")

class Especie(db.Model):
    __tablename__ = 'especies_animales'
    id = Column(Integer, primary_key=True)
    nombre = Column(String(50), nullable=False, unique=True)
    tipos = relationship("Tipo", backref="especie", lazy=True)
    razas = relationship("Raza", backref="especie", lazy=True)
    estados_reproductivos = relationship("EstadoReproductivo", backref="especie", lazy=True)

    def __repr__(self):
        return f"<Especie {self.nombre}>"

class Tipo(db.Model):
    __tablename__ = 'tipos_animales'
    id = Column(Integer, primary_key=True)
    nombre = Column(String(50), nullable=False)
    especie_id = Column(Integer, ForeignKey("especies_animales.id"), nullable=False)
    razas = relationship("Raza", backref="tipo", lazy=True)

    __table_args__ = (db.UniqueConstraint('nombre', 'especie_id', name='uix_tipo_nombre_especie'),)

    def __repr__(self):
        return f"<Tipo {self.nombre} (Especie: {self.especie.nombre})>"

class Raza(db.Model):
    __tablename__ = 'razas_animales'
    id = Column(Integer, primary_key=True)
    nombre = Column(String(50), nullable=False)
    especie_id = Column(Integer, ForeignKey("especies_animales.id"), nullable=False)
    tipo_id = Column(Integer, ForeignKey("tipos_animales.id"), nullable=False)
    animales = relationship("Animal", backref="raza", lazy=True)

    def __repr__(self):
        return f"<Raza {self.nombre} (Tipo: {self.tipo.nombre})>"

class Animal(db.Model):
    __tablename__ = 'animales'
    id = Column(Integer, primary_key=True)
    nombre = Column(String(50), nullable=False)
    numero_identificacion = Column(String(50), unique=True)
    fecha_nacimiento = Column(Date)
    
    # Zoometría
    peso = Column(Float)
    altura_cruz = Column(Float)
    longitud_tronco = Column(Float)
    perimetro_toracico = Column(Float)
    ancho_grupa = Column(Float)
    longitud_grupa = Column(Float)

    # Reproducción
    estado_reproductivo_id = Column(Integer, ForeignKey("estado_reproductivo_animales.id"))
    estado_reproductivo = relationship("EstadoReproductivo", backref="animales", lazy=True)
    numero_partos = Column(Integer)
    intervalo_partos = Column(Integer)
    fertilidad = Column(Float)
    ubicacion_sensor = Column(String(100))
    
    # Relaciones
    parcela_id = Column(Integer, ForeignKey("parcelas.id"))
    parcela = relationship("Parcela", backref="animales", lazy=True)
    raza_id = Column(Integer, ForeignKey("razas_animales.id"))
    sexo_id = Column(Integer, ForeignKey("sexos_animales.id"))
    sexo = relationship("Sexo", backref="animales", lazy=True)
    asignaciones_collar = relationship("AsignacionCollar", backref="animal", lazy=True, cascade="all, delete-orphan") 

class Sexo(db.Model):
    __tablename__ = 'sexos_animales'
    id = Column(Integer, primary_key=True)
    nombre = Column(String(50), nullable=False)
    estados_reproductivos = relationship("EstadoReproductivo", backref="sexo", lazy=True)

    def __repr__(self):
        return f"<Sexo {self.nombre}>"

class EstadoReproductivo(db.Model):
    __tablename__ = 'estado_reproductivo_animales'
    id = Column(Integer, primary_key=True)
    nombre = Column(String(50), nullable=False)
    sexo_id = Column(Integer, ForeignKey("sexos_animales.id"), nullable=False)
    especie_id = Column(Integer, ForeignKey("especies_animales.id"), nullable=False)

    def __repr__(self):
        return f"<EstadoReproductivo {self.nombre}>"

class EstadoCollar(db.Model): 
    __tablename__ = 'estado_collar_animales'
    id = Column(Integer, primary_key=True)
    nombre = Column(String(50), nullable=False) 
    collares = relationship("Collar", backref="estado_collar", lazy=True)

    def __repr__(self):
        return f"<EstadoCollar {self.nombre}>"

class Collar(db.Model):
    __tablename__ = 'collares'
    id = Column(Integer, primary_key=True)
    codigo = Column(String(50), unique=True, nullable=False)
    bateria = Column(Float)
    ultima_actividad = Column(DateTime)
    estado_collar_id = Column(Integer, ForeignKey("estado_collar_animales.id"), nullable=False)
    
    asignaciones = relationship("AsignacionCollar", backref="collar", lazy=True, cascade="all, delete-orphan")

class AsignacionCollar(db.Model):
    __tablename__ = 'asignaciones_collar'
    id = Column(Integer, primary_key=True)
    collar_id = Column(Integer, ForeignKey('collares.id'), nullable=False)
    animal_id = Column(Integer, ForeignKey('animales.id'), nullable=False)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"))
    fecha_inicio = Column(DateTime, nullable=False, default=datetime.now)
    fecha_fin = Column(DateTime)
    motivo_cambio = Column(String(100))

    __table_args__ = (
        db.UniqueConstraint('collar_id', 'fecha_fin', name='uq_collar_activo'),
    )

class NodoAutorizado(db.Model):
    __tablename__ = 'nodos_autorizados'
    id = Column(Integer, primary_key=True)
    collar_id = Column(Integer, ForeignKey('collares.id'), unique=True, nullable=False)

    client_id = Column(String(100), unique=True, nullable=False)
    certificado_cn = Column(String(100), nullable=True)
    esta_autorizado = Column(Boolean, default=False)
    fecha_autorizacion = Column(DateTime, default=datetime.now)

    usuario_id = Column(Integer, ForeignKey("usuarios.id"))
    observaciones = Column(Text)
    
    collar = relationship("Collar", backref="nodo_autorizado", uselist=False)
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

class UbicacionActual(db.Model):
    __tablename__ = 'ubicacion_actual'
    id = Column(Integer, primary_key=True)
    animal_id = Column(Integer, ForeignKey('animales.id'), unique=True)
    timestamp = Column(DateTime)
    lat = Column(Float)
    lon = Column(Float)
    
    animal = relationship("Animal", backref="ubicacion_actual", uselist=False)

class Temperatura(db.Model):
    __tablename__ = 'temperaturas'
    id = Column(Integer, primary_key=True)
    timestamp = Column(DateTime)
    corporal = Column(Float)
    ambiente = Column(Float)

    collar_id = Column(Integer, ForeignKey('collares.id'))
    collar = relationship("Collar", backref="temperaturas")

class Acelerometro(db.Model):
    __tablename__ = 'aceleraciones'
    id = Column(Integer, primary_key=True)
    timestamp = Column(DateTime)
    x = Column(Float)
    y = Column(Float)
    z = Column(Float)

    collar_id = Column(Integer, ForeignKey('collares.id'))
    collar = relationship("Collar", backref="aceleraciones")

class Parcela(db.Model):
    __tablename__ = 'parcelas'
    id = Column(Integer, primary_key=True)
    nombre = Column(String(100))
    descripcion = Column(String(200))
    perimetro_geojson = Column(Text)
    area = Column(Float)
    campo_id = Column(Integer, ForeignKey("campos.id"), nullable=False)
    campo = relationship("Campo", backref="parcelas", lazy=True)

    def __repr__(self):
        return f"<Parcela {self.nombre} (Campo: {self.campo.nombre})>"

class Campo(db.Model):
    __tablename__ = 'campos'
    id = Column(Integer, primary_key=True)
    nombre = Column(String(100), nullable=False)
    descripcion = Column(String(200))
    lat = Column(Float)
    lon = Column(Float)
    is_preferred = Column(Boolean, default=False)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)

# class EventoSanitario(db.Model):
#     id = Column(Integer, primary_key=True)
#     animal_id = Column(Integer, ForeignKey('animales.id'))
#     fecha = Column(DateTime, nullable=False)
#     tipo = Column(String(50))  # vacuna, tratamiento, enfermedad
#     subtipo = Column(String(100))  # clostridiosis, mastitis, ivermectina...
#     descripcion = Column(Text)

#     via_administracion = Column(String(50))  # oral, subcutánea, etc.
#     dosis = Column(Float)
#     unidad_dosis = Column(String(10))  # ml, mg, etc.

#     fecha_proxima_dosis = Column(Date)
#     resultado = Column(String(100))  # mejorado, pendiente, muerto
#     responsable = Column(String(100))
#     usuario_id = Column(Integer, ForeignKey("usuarios.id"))


# class ResumenAnimalDiario(db.Model):
#     id = Column(Integer, primary_key=True)
#     animal_id = Column(Integer, ForeignKey('animales.id'))
#     fecha = Column(Date, index=True)
    
#     temp_promedio = Column(Float)
#     temp_max = Column(Float)
#     temp_min = Column(Float)

#     tiempo_activo = Column(Float)  # en minutos
#     tiempo_inactivo = Column(Float)
#     tiempo_rumiando = Column(Float)
#     tiempo_dormido = Column(Float)

#     distancia_recorrida = Column(Float)

#     eventos_criticos = Column(Integer)
#     alertas_generadas = Column(Integer)

#     lat_promedio = Column(Float)
#     lon_promedio = Column(Float)
#     parcela_id = Column(Integer, ForeignKey('parcelas.id'))

#     humedad_ambiente = Column(Float)
#     temp_ambiente = Column(Float)


# class Alarma(db.Model):
#     id = Column(Integer, primary_key=True)
#     animal_id = Column(Integer, ForeignKey('animales.id'))
#     fecha = Column(DateTime, index=True)
#     tipo = Column(String(50))  # "temperatura alta", "inactividad", etc.
#     severidad = Column(String(20))  # crítica, media, leve
#     valor_detectado = Column(Float)
#     umbral = Column(Float)

#     observacion = Column(Text)
#     confirmada = Column(Boolean, default=False)
#     fecha_confirmacion = Column(DateTime)
#     usuario_confirmo_id = Column(Integer, ForeignKey('usuarios.id'))

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

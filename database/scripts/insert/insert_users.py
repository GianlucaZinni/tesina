from backend.app import db
from backend.app.models import Usuario, Persona, TipoUsuario
from datetime import datetime

import os

current_dir = os.path.dirname(os.path.realpath(__file__))
root_path = os.path.abspath(os.path.join(current_dir, '..', '..', 'files')).replace("\\", "/")

def populate_users():
    tipo_usuarios()
    users()

def tipo_usuarios():
    if TipoUsuario.query.count() > 0:
        return

    admin = TipoUsuario(tipousuario="Administrador")
    dueño = TipoUsuario(tipousuario="Dueño")
    empleado = TipoUsuario(tipousuario="Empleado")
    db.session.add_all([admin, dueño, empleado])
    db.session.commit()

def users():
    
    if Usuario.query.count() > 0 or Persona.query.count() > 0:
        return

    # Crear usuarios
    usuario1 = Usuario(username="zinnigianluca@gmail.com", password="1234", id_tipousuario=1)
    db.session.add(usuario1)
    db.session.flush()
    persona1 = Persona(
        nombre="Gianluca",
        apellido="Zinni", 
        cumpleanios=datetime.strptime("2001-08-23", "%Y-%m-%d"), 
        dni="42886236", 
        id=usuario1.id)

    db.session.add(persona1)
    db.session.commit()


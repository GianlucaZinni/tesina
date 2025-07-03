from backend.app.db import SessionLocal
from backend.app.models import Usuario, Persona, TipoUsuario
from datetime import datetime

import os

current_dir = os.path.dirname(os.path.realpath(__file__))
root_path = os.path.abspath(os.path.join(current_dir, '..', '..', 'files')).replace("\\", "/")

def populate_users():
    with SessionLocal() as session:
        tipo_usuarios(session)
        users(session)

def tipo_usuarios(session):
    if session.query(TipoUsuario).count() > 0:
        return

    admin = TipoUsuario(tipousuario="Administrador")
    dueño = TipoUsuario(tipousuario="Dueño")
    empleado = TipoUsuario(tipousuario="Empleado")
    session.add_all([admin, dueño, empleado])
    session.commit()

def users(session):
    if session.query(Usuario).count() > 0 or session.query(Persona).count() > 0:
        return

    # Crear usuarios
    usuario1 = Usuario(username="zinnigianluca@gmail.com", password="1234", id_tipousuario=1)
    session.add(usuario1)
    session.flush()
    persona1 = Persona(
        nombre="Gianluca",
        apellido="Zinni", 
        cumpleanios=datetime.strptime("2001-08-23", "%Y-%m-%d"), 
        dni="42886236", 
        id=usuario1.id)

    session.add(persona1)
    session.commit()

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from werkzeug.security import check_password_hash

from backend.app.db import get_db
from backend.app.login_manager import (
    create_access_token,
    get_current_user,
)
from backend.app.models.usuario import Usuario, LoginForm


router = APIRouter(prefix="/api/user")


@router.post("/login")
def login(form: LoginForm, db: Session = Depends(get_db)):

    user = db.query(Usuario).filter_by(username=form.username).first()
    # if not user or not check_password_hash(user.password, form.password):
    #     raise HTTPException(status_code=401, detail="Credenciales inválidas")

    if not user or not user.password == form.password:
        raise HTTPException(status_code=401, detail="Credenciales inválidas")

    token = create_access_token({"sub": str(user.id)})
    return {
        "status": "ok",
        "message": "Inicio de sesión exitoso",
        "access_token": token,
        "user": {
            "id": user.id,
            "username": user.username,
            "role": user.id_tipousuario,
        },
    }


@router.post("/logout")
def logout() -> dict:
    # Con tokens JWT no hay sesión en servidor, por lo que solo devolvemos OK
    return {"status": "ok", "message": "Sesión cerrada correctamente"}


@router.get("/session")
def session_status(current_user: Usuario = Depends(get_current_user)):
    return {
        "authenticated": True,
        "user": {
            "id": current_user.id,
            "username": current_user.username,
            "role": current_user.id_tipousuario,
        },
    }

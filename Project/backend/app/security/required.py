from fastapi import Depends, HTTPException, status

from backend.app.login_manager import get_current_user
from backend.app.models.usuario import Usuario


def admin_required(current_user: Usuario = Depends(get_current_user)) -> Usuario:
    if current_user.id_tipousuario != 1:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN)
    return current_user


def owner_required(current_user: Usuario = Depends(get_current_user)) -> Usuario:
    print(current_user)
    if current_user.id_tipousuario != 1 or current_user.id_tipousuario != 2:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN)
    return current_user


def employee_required(current_user: Usuario = Depends(get_current_user)) -> Usuario:
    if current_user.id_tipousuario != 1 or current_user.id_tipousuario != 2 or current_user.id_tipousuario != 3:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN)
    return current_user
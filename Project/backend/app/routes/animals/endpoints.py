from typing import List, Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.app.db import get_db
from backend.app.models import Animal
from backend.app.models.usuario import Usuario
from backend.app.login_manager import get_current_user

router = APIRouter(prefix="/api/animals")


class AnimalCreate(BaseModel):
    nombre: str


class AnimalOut(BaseModel):
    id: int
    nombre: str

    class Config:
        orm_mode = True


@router.get("/", response_model=List[AnimalOut])
def list_animals(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    animals = db.query(Animal).all()
    return animals


@router.post("/", response_model=AnimalOut)
def create_animal(
    data: AnimalCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    animal = Animal(nombre=data.nombre)
    db.add(animal)
    db.commit()
    db.refresh(animal)
    return animal

from typing import List, Dict
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func

from backend.app.db import get_db
from backend.app.models import (
    Parcela,
    Collar,
    Temperatura,
    UbicacionActual,
    AsignacionCollar,
    Especie,
    Tipo,
    Raza,
    Sexo,
    EstadoReproductivo,
    EstadoCollar,
    Usuario,
    Campo
)
from backend.app.models.animal import Animal, AnimalCreate, AnimalUpdate, AnimalBatchDelete
from backend.app.login_manager import get_current_user
from backend.app.routes.collares.helpers import get_estado_id
from .helpers import is_animal_outside, generate_identifier

router = APIRouter(prefix="/api/animals")


# ---------------------------------------------------------------------------
# Listado completo de animales con datos relacionados
# ---------------------------------------------------------------------------

@router.get("/", response_model=List[Dict])
def list_animals(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    animales = (
        db.query(Animal)
        .options(
            joinedload(Animal.parcela).joinedload(Parcela.campo),
            joinedload(Animal.raza).joinedload(Raza.tipo),
            joinedload(Animal.raza).joinedload(Raza.especie),
            joinedload(Animal.sexo),
            joinedload(Animal.estado_reproductivo),
        )
        .all()
    )

    asignaciones = (
        db.query(
            AsignacionCollar.animal_id,
            Collar.id.label("collar_id"),
            Collar.codigo,
            Collar.bateria,
            EstadoCollar.nombre.label("estado"),
            Collar.ultima_actividad,
        )
        .join(Collar, AsignacionCollar.collar_id == Collar.id)
        .join(EstadoCollar, Collar.estado_collar_id == EstadoCollar.id)
        .filter(AsignacionCollar.fecha_fin.is_(None))
        .all()
    )
    collares_dict = {
        a.animal_id: {
            "collar_id": a.collar_id,
            "codigo": a.codigo,
            "bateria": a.bateria,
            "estado": a.estado,
            "ultima_actividad": a.ultima_actividad.isoformat() if a.ultima_actividad else None,
        }
        for a in asignaciones
    }

    ubicaciones = db.query(
        UbicacionActual.animal_id,
        UbicacionActual.lat,
        UbicacionActual.lon,
        UbicacionActual.timestamp,
    ).all()

    ubicacion_dict = {
        u.animal_id: {
            "lat": u.lat,
            "lon": u.lon,
            "timestamp": u.timestamp.isoformat() if u.timestamp else None,
        }
        for u in ubicaciones
    }

    subquery_temp = (
        db.query(Temperatura.collar_id, func.max(Temperatura.timestamp).label("max_ts"))
        .group_by(Temperatura.collar_id)
        .subquery()
    )

    temp_rows = (
        db.query(Temperatura.collar_id, Temperatura.timestamp, Temperatura.corporal)
        .join(subquery_temp, (Temperatura.collar_id == subquery_temp.c.collar_id) & (Temperatura.timestamp == subquery_temp.c.max_ts))
        .all()
    )

    temp_dict = {
        r.collar_id: {
            "corporal": r.corporal,
            "timestamp": r.timestamp.isoformat() if r.timestamp else None,
        }
        for r in temp_rows
    }

    result = []
    for animal in animales:
        collar_data = collares_dict.get(animal.id)
        ubic = ubicacion_dict.get(animal.id)
        temp = (
            temp_dict.get(collar_data["collar_id"])
            if collar_data and collar_data.get("collar_id")
            else None
        )

        result.append(
            {
                "animal_id": animal.id,
                "nombre": animal.nombre,
                "numero_identificacion": animal.numero_identificacion,
                "fecha_nacimiento": animal.fecha_nacimiento.isoformat() if animal.fecha_nacimiento else None,
                "peso": animal.peso,
                "altura_cruz": animal.altura_cruz,
                "longitud_tronco": animal.longitud_tronco,
                "perimetro_toracico": animal.perimetro_toracico,
                "ancho_grupa": animal.ancho_grupa,
                "longitud_grupa": animal.longitud_grupa,
                "ubicacion_sensor": animal.ubicacion_sensor,
                "parcela_id": animal.parcela_id,
                "raza_id": animal.raza_id,
                "sexo_id": animal.sexo_id,
                "estado_reproductivo_id": animal.estado_reproductivo_id,
                "parcela": animal.parcela.nombre if animal.parcela else None,
                "especie": animal.raza.especie.nombre if animal.raza and animal.raza.especie else None,
                "raza": animal.raza.nombre if animal.raza else None,
                "tipo": animal.raza.tipo.nombre if animal.raza and animal.raza.tipo else None,
                "sexo": animal.sexo.nombre if animal.sexo else None,
                "estado_reproductivo_nombre": animal.estado_reproductivo.nombre if animal.estado_reproductivo else None,
                "numero_partos": animal.numero_partos,
                "intervalo_partos": animal.intervalo_partos,
                "fertilidad": animal.fertilidad,
                "lat": ubic["lat"] if ubic else None,
                "lon": ubic["lon"] if ubic else None,
                "temperatura_corporal_actual": temp["corporal"] if temp else None,
                "hora_temperatura": temp["timestamp"] if temp else None,
                "campo": animal.parcela.campo.nombre if animal.parcela and animal.parcela.campo else None,
                "collar_asignado": collar_data if collar_data else None,
            }
        )

    return result


# ---------------------------------------------------------------------------
# Agrupa animales dentro y fuera de parcelas
# ---------------------------------------------------------------------------

@router.get("/{campo_id}/entities", response_model=Dict)
def cluster_animals(
    campo_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    animals = (
        db.query(Animal)
        .join(Parcela)
        .filter(Parcela.campo_id == campo_id)
        .options(
            joinedload(Animal.parcela).joinedload(Parcela.campo),
            joinedload(Animal.raza).joinedload(Raza.tipo),
            joinedload(Animal.raza).joinedload(Raza.especie),
            joinedload(Animal.sexo),
            joinedload(Animal.estado_reproductivo),
        )
        .all()
    )

    collares_dict = {
        a.animal_id: {
            "collar_id": a.collar_id,
            "codigo": a.codigo,
            "bateria": a.bateria,
            "estado": a.estado_nombre,
            "ultima_actividad": a.ultima_actividad.isoformat() if a.ultima_actividad else None,
        }
        for a in db.query(
            AsignacionCollar.animal_id,
            Collar.id.label("collar_id"),
            Collar.codigo,
            Collar.bateria,
            EstadoCollar.nombre.label("estado_nombre"),
            Collar.ultima_actividad,
        )
        .join(Collar, AsignacionCollar.collar_id == Collar.id)
        .join(EstadoCollar, Collar.estado_collar_id == EstadoCollar.id)
        .filter(AsignacionCollar.fecha_fin.is_(None))
        .all()
    }

    ubicacion_dict = {
        u.animal_id: {
            "lat": u.lat,
            "lon": u.lon,
            "timestamp": u.timestamp.isoformat() if u.timestamp else None,
        }
        for u in db.query(
            UbicacionActual.animal_id,
            UbicacionActual.lat,
            UbicacionActual.lon,
            UbicacionActual.timestamp,
        ).all()
    }

    subquery_temp = (
        db.query(Temperatura.collar_id, func.max(Temperatura.timestamp).label("max_ts"))
        .group_by(Temperatura.collar_id)
        .subquery()
    )

    temp_dict = {
        t.collar_id: {
            "corporal": t.corporal,
            "timestamp": t.timestamp.isoformat() if t.timestamp else None,
        }
        for t in db.query(
            Temperatura.collar_id,
            Temperatura.timestamp,
            Temperatura.corporal,
        ).join(
            subquery_temp,
            (Temperatura.collar_id == subquery_temp.c.collar_id)
            & (Temperatura.timestamp == subquery_temp.c.max_ts),
        )
        .all()
    }

    inside_animals = []
    outside_animals = []

    for animal in animals:
        collar_data = collares_dict.get(animal.id)
        coords = ubicacion_dict.get(animal.id)
        lon = coords["lon"] if coords else None
        lat = coords["lat"] if coords else None
        outside = is_animal_outside(animal, lon, lat) if lon and lat else None
        temp = (
            temp_dict.get(collar_data["collar_id"])
            if collar_data and collar_data.get("collar_id")
            else None
        )

        if collar_data:
            animal_data = {
                "animal_id": animal.id,
                "nombre": animal.nombre,
                "numero_identificacion": animal.numero_identificacion,
                "fecha_nacimiento": animal.fecha_nacimiento.isoformat() if animal.fecha_nacimiento else None,
                "peso": animal.peso,
                "ubicacion_sensor": animal.ubicacion_sensor,
                "parcela": animal.parcela.nombre if animal.parcela else None,
                "especie": animal.raza.especie.nombre if animal.raza and animal.raza.especie else None,
                "raza": animal.raza.nombre if animal.raza else None,
                "tipo": animal.raza.tipo.nombre if animal.raza and animal.raza.tipo else None,
                "sexo": animal.sexo.nombre if animal.sexo else None,
                "estado_reproductivo": animal.estado_reproductivo.nombre if animal.estado_reproductivo else None,
                "lat": lat,
                "lon": lon,
                "temperatura_corporal_actual": temp["corporal"] if temp else None,
                "hora_temperatura": temp["timestamp"] if temp else None,
                "campo": animal.parcela.campo.nombre,
                "is_outside": outside,
                "collar_asignado": collar_data,
            }
            if outside is not None:
                (outside_animals if outside else inside_animals).append(animal_data)

    return {"inside": inside_animals, "outside": outside_animals}


# ---------------------------------------------------------------------------
# Lista de acrónimos existentes
# ---------------------------------------------------------------------------

@router.get("/acronimos")
def get_acronyms(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    rows = (
        db.query(Animal.numero_identificacion)
        .join(Parcela, Animal.parcela_id == Parcela.id)
        .join(Campo, Parcela.campo_id == Campo.id)
        .filter(Campo.usuario_id == current_user.id)
        .filter(Animal.numero_identificacion.isnot(None))
        .all()
    )

    acronyms = sorted({(r[0].split("-")[0]) for r in rows if "-" in (r[0] or "")})
    return {"acronimos": acronyms}



# ---------------------------------------------------------------------------
# Opciones para selects en el frontend
# ---------------------------------------------------------------------------

@router.get("/options")
def get_options(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    return {
        "especies": [
            {"id": e.id, "nombre": e.nombre} for e in db.query(Especie).order_by(Especie.nombre).all()
        ],
        "tipos": [
            {"id": t.id, "nombre": t.nombre, "especie_id": t.especie_id} for t in db.query(Tipo).order_by(Tipo.nombre).all()
        ],
        "razas": [
            {
                "id": r.id,
                "nombre": r.nombre,
                "especie_id": r.especie_id,
                "tipo_id": r.tipo_id,
            }
            for r in db.query(Raza).order_by(Raza.nombre).all()
        ],
        "sexos": [{"id": s.id, "nombre": s.nombre} for s in db.query(Sexo).order_by(Sexo.nombre).all()],
        "parcelas": [{"id": p.id, "nombre": p.nombre} for p in db.query(Parcela).order_by(Parcela.nombre).all()],
        "estados_reproductivos": [
            {
                "id": er.id,
                "nombre": er.nombre,
                "sexo_id": er.sexo_id,
                "especie_id": er.especie_id,
            }
            for er in db.query(EstadoReproductivo).order_by(EstadoReproductivo.nombre).all()
        ],
    }


# ---------------------------------------------------------------------------
# Ficha simple para detalles rápidos
# ---------------------------------------------------------------------------

@router.get("/{animal_id}/simple_sheet", response_model=Dict)
def animals_simple_sheet(
    animal_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    animal = (
        db.query(Animal)
        .options(
            joinedload(Animal.raza).joinedload(Raza.tipo),
            joinedload(Animal.raza).joinedload(Raza.especie),
            joinedload(Animal.sexo),
            joinedload(Animal.estado_reproductivo),
        )
        .filter_by(id=animal_id)
        .first()
    )
    if not animal:
        raise HTTPException(status_code=404, detail="Animal no encontrado")

    asignacion = db.query(AsignacionCollar).filter_by(animal_id=animal_id, fecha_fin=None).first()
    collar = None
    if asignacion:
        collar = db.query(Collar).options(joinedload(Collar.estado_collar)).get(asignacion.collar_id)

    ubicacion = db.query(UbicacionActual).filter_by(animal_id=animal_id).first()

    temperatura_data = None
    if collar:
        subquery = (
            db.query(Temperatura.collar_id, func.max(Temperatura.timestamp).label("max_ts"))
            .filter(Temperatura.collar_id == collar.id)
            .group_by(Temperatura.collar_id)
            .subquery()
        )
        temperatura_data = (
            db.query(Temperatura.corporal, Temperatura.timestamp)
            .join(subquery, (Temperatura.collar_id == subquery.c.collar_id) & (Temperatura.timestamp == subquery.c.max_ts))
            .first()
        )

    return {
        "id": animal.id,
        "nombre": animal.nombre,
        "numero_identificacion": animal.numero_identificacion,
        "raza": animal.raza.nombre if animal.raza else None,
        "sexo": animal.sexo.nombre if animal.sexo else None,
        "tipo": animal.raza.tipo.nombre if animal.raza and animal.raza.tipo else None,
        "estado_reproductivo_id": animal.estado_reproductivo.id if animal.estado_reproductivo else None,
        "estado_reproductivo_nombre": animal.estado_reproductivo.nombre if animal.estado_reproductivo else None,
        "lat": ubicacion.lat if ubicacion else None,
        "lon": ubicacion.lon if ubicacion else None,
        "timestamp": ubicacion.timestamp.isoformat() if ubicacion and ubicacion.timestamp else None,
        "temperatura": temperatura_data.corporal if temperatura_data else None,
        "hora_temperatura": temperatura_data.timestamp.isoformat() if temperatura_data and temperatura_data.timestamp else None,
        "collar_id": collar.id if collar else None,
        "estado_collar": collar.estado_collar.nombre if collar and collar.estado_collar else None,
        "bateria": collar.bateria if collar else None,
    }


# ---------------------------------------------------------------------------
# Ficha completa para edición
# ---------------------------------------------------------------------------

@router.get("/{animal_id}/complete_sheet", response_model=Dict)
def animals_complete_sheet(
    animal_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    animal = (
        db.query(Animal)
        .options(
            joinedload(Animal.raza).joinedload(Raza.tipo),
            joinedload(Animal.raza).joinedload(Raza.especie),
            joinedload(Animal.sexo),
            joinedload(Animal.estado_reproductivo),
            joinedload(Animal.parcela),
        )
        .filter_by(id=animal_id)
        .first()
    )
    if not animal:
        raise HTTPException(status_code=404, detail="Animal no encontrado")

    return {
        "animal_id": animal.id,
        "nombre": animal.nombre,
        "numero_identificacion": animal.numero_identificacion,
        "fecha_nacimiento": animal.fecha_nacimiento.isoformat() if animal.fecha_nacimiento else None,
        "ubicacion_sensor": animal.ubicacion_sensor,
        "peso": animal.peso,
        "altura_cruz": animal.altura_cruz,
        "longitud_tronco": animal.longitud_tronco,
        "perimetro_toracico": animal.perimetro_toracico,
        "ancho_grupa": animal.ancho_grupa,
        "longitud_grupa": animal.longitud_grupa,
        "estado_reproductivo_id": animal.estado_reproductivo_id,
        "numero_partos": animal.numero_partos,
        "intervalo_partos": animal.intervalo_partos,
        "fertilidad": animal.fertilidad,
        "parcela_id": animal.parcela_id,
        "raza_id": animal.raza_id,
        "sexo_id": animal.sexo_id,
        "tipo_id": animal.raza.tipo.id if animal.raza and animal.raza.tipo else None,
        "especie_id": animal.raza.especie.id if animal.raza and animal.raza.especie else None,
    }


# ---------------------------------------------------------------------------
# Crear nuevo animal
# ---------------------------------------------------------------------------

@router.post("/", response_model=Dict, status_code=201)
def create_animal(
    data: AnimalCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    nombre = data.nombre
    sexo_id = data.sexo_id
    raza_id = data.raza_id
    parcela_id = data.parcela_id
    acronimo = (data.acronimo_identificacion or "").upper()

    if not all([nombre, sexo_id, raza_id, parcela_id, acronimo]):
        raise HTTPException(status_code=400, detail="Faltan datos obligatorios")

    parcela = db.get(Parcela, parcela_id)
    if not parcela or parcela.campo.usuario_id != current_user.id:
        raise HTTPException(status_code=403, detail="Parcela no valida o no autorizada")

    try:
        numero_identificacion = generate_identifier(acronimo, db)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    nuevo = Animal(
        nombre=nombre,
        numero_identificacion=numero_identificacion,
        raza_id=raza_id,
        sexo_id=sexo_id,
        fecha_nacimiento=data.fecha_nacimiento,
        peso=data.peso,
        altura_cruz=data.altura_cruz,
        longitud_tronco=data.longitud_tronco,
        perimetro_toracico=data.perimetro_toracico,
        ancho_grupa=data.ancho_grupa,
        longitud_grupa=data.longitud_grupa,
        estado_reproductivo_id=data.estado_reproductivo_id,
        numero_partos=data.numero_partos or "",
        intervalo_partos=data.intervalo_partos or "",
        fertilidad=data.fertilidad or 0,
        ubicacion_sensor=data.ubicacion_sensor,
        parcela_id=parcela_id,
    )
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return {"status": "ok", "message": "Animal creado correctamente"}


# ---------------------------------------------------------------------------
# Actualizar animal existente
# ---------------------------------------------------------------------------

@router.put("/{animal_id}", response_model=Dict)
def update_animal(
    animal_id: int,
    data: AnimalUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    animal = db.get(Animal, animal_id)
    if not animal:
        raise HTTPException(status_code=404, detail="Animal no encontrado")
    if animal.parcela and animal.parcela.campo.usuario_id != current_user.id:
        raise HTTPException(status_code=403, detail="No autorizado para actualizar este animal")

    update_data = data.dict(exclude_unset=True)

    fecha_nacimiento = update_data.pop("fecha_nacimiento", None)
    if fecha_nacimiento is not None:
        animal.fecha_nacimiento = fecha_nacimiento

    new_parcela_id = update_data.pop("parcela_id", None)
    if new_parcela_id is not None:
        if new_parcela_id:
            parcela = db.get(Parcela, new_parcela_id)
            if not parcela or parcela.campo.usuario_id != current_user.id:
                raise HTTPException(status_code=403, detail="Parcela no valida o no autorizada")
            animal.parcela_id = new_parcela_id
        else:
            animal.parcela_id = None

    for field, value in update_data.items():
        setattr(animal, field, value)

    db.commit()
    db.refresh(animal)
    return {"status": "ok", "message": "Animal actualizado correctamente"}


# ---------------------------------------------------------------------------
# Eliminar animal
# ---------------------------------------------------------------------------

@router.delete("/{animal_id}", response_model=Dict)
def delete_animal(
    animal_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    animal = db.get(Animal, animal_id)
    if not animal:
        raise HTTPException(status_code=404, detail="Animal no encontrado")
    if animal.parcela and animal.parcela.campo.usuario_id != current_user.id:
        raise HTTPException(status_code=403, detail="No autorizado")

    asignacion = db.query(AsignacionCollar).filter_by(animal_id=animal_id, fecha_fin=None).first()
    if asignacion:
        asignacion.fecha_fin = datetime.utcnow()
        collar = db.get(Collar, asignacion.collar_id)
        disponible_id = get_estado_id("disponible", db)
        if collar:
            collar.estado_collar_id = disponible_id
            db.add(collar)
        db.add(asignacion)

    db.delete(animal)
    db.commit()
    return {"status": "ok", "message": "Animal eliminado correctamente"}


@router.delete("/", response_model=Dict)
def batch_delete_animals(
    request: AnimalBatchDelete,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    deleted = 0
    for animal_id in request.ids:
        animal = db.get(Animal, animal_id)
        if not animal:
            continue
        if animal.parcela and animal.parcela.campo.usuario_id != current_user.id:
            continue
        asignacion = db.query(AsignacionCollar).filter_by(animal_id=animal_id, fecha_fin=None).first()
        if asignacion:
            asignacion.fecha_fin = datetime.now()
            collar = db.get(Collar, asignacion.collar_id)
            disponible_id = get_estado_id("disponible", db)
            if collar:
                collar.estado_collar_id = disponible_id
                db.add(collar)
            db.add(asignacion)
        db.delete(animal)
        deleted += 1
    db.commit()
    return {"status": "ok", "message": f"Se han eliminado los {deleted} animales seleccionados."}
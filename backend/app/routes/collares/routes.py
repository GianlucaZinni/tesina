# ~/Project/backend/src/Routes/collares/routes.py
import re
import csv
from io import StringIO
from flask import Blueprint, request, jsonify, make_response
from flask_login import login_required, current_user
from backend.app import db
from backend.app.models import AsignacionCollar, Collar, Animal, EstadoCollar, Usuario, Parcela, Campo # Importar Parcela y Campo
from datetime import datetime
from sqlalchemy.exc import IntegrityError

collares = Blueprint("collares", __name__, url_prefix="/api/collares")

# --- Variables globales para los estados de collar ---
# Inicializadas como None o diccionarios vacíos, se llenarán dentro del contexto de la aplicación.
_estados_collar_map = None # Usaremos un nombre con guion bajo para indicar que es "privado" al módulo
_estado_disponible_obj = None
_estado_activo_obj = None
_estado_sin_bateria_obj = None
_estado_defectuoso_obj = None

def _load_collar_states():
    """Carga los objetos de estado de collar desde la base de datos."""
    global _estados_collar_map, _estado_disponible_obj, _estado_activo_obj, _estado_sin_bateria_obj, _estado_defectuoso_obj
    
    # Solo cargar si no han sido cargados previamente
    if _estados_collar_map is None:
        try:
            all_states = EstadoCollar.query.all()
            _estados_collar_map = {e.nombre.lower(): e for e in all_states}
            _estado_disponible_obj = _estados_collar_map.get("disponible")
            _estado_activo_obj = _estados_collar_map.get("activo")
            _estado_sin_bateria_obj = _estados_collar_map.get("sin bateria")
            _estado_defectuoso_obj = _estados_collar_map.get("defectuoso")

            if not all([_estado_disponible_obj, _estado_activo_obj, _estado_sin_bateria_obj, _estado_defectuoso_obj]):
                print("WARNING: Faltan estados de collar críticos en la base de datos.")
                # Aquí podrías lanzar una excepción o registrar un error severo si estos estados son esenciales.
                # Para este caso, continuaremos, pero las funciones que los usen deberán verificar si son None.
        except Exception as e:
            print(f"ERROR: No se pudieron cargar los estados de collar al iniciar el Blueprint: {e}")
            # Esto podría indicar un problema con la DB o los modelos al inicio.
            # Asegúrate de que tu app se inicie correctamente y que la DB esté migrada.


# Registramos un callback que se ejecuta antes de la primera solicitud
# Esto asegura que db esté inicializado y en un contexto de aplicación
@collares.before_app_first_request
def initialize_collar_states():
    _load_collar_states()


# --- Funciones Auxiliares para Estados de Collar (adaptadas para usar las variables globales) ---
def get_estado_collar_id(nombre_estado):
    """Obtiene el ID de un estado de collar por su nombre."""
    if _estados_collar_map is None: # Si por alguna razón no se cargó al inicio, intentar cargar ahora
        _load_collar_states()
        if _estados_collar_map is None: # Si sigue siendo None, algo está muy mal
            return None # O lanzar error
            
    estado = _estados_collar_map.get(nombre_estado.lower())
    return estado.id if estado else None


def get_estado_collar_nombre(id_estado):
    """Obtiene el nombre de un estado de collar por su ID."""
    if _estados_collar_map is None:
        _load_collar_states()
        if _estados_collar_map is None:
            return "desconocido"

    # Buscar en el mapa el objeto de estado por su ID
    for estado_obj in _estados_collar_map.values():
        if estado_obj.id == id_estado:
            return estado_obj.nombre
    return "desconocido"


# --- Funciones Auxiliares para Animales (se mantienen) ---
def get_animal_by_identificacion(numero_identificacion):
    if not numero_identificacion:
        return None
    # Asegúrate de que Parcela y Campo estén importados para esta consulta
    from backend.app.models import Parcela, Campo # Importación local si es necesario para evitar circular imports
    animal = (
        Animal.query.filter_by(numero_identificacion=numero_identificacion)
        .join(Animal.parcela)
        .join(Parcela.campo)
        .filter(Campo.usuario_id == current_user.id)
        .first()
    )
    return animal

# --- NUEVAS FUNCIONES CENTRALIZADAS DE GESTIÓN DE COLLARES ---

def _create_new_collar_logic(codigo):
    """Crea un nuevo collar con estado 'disponible' y batería 100%."""
    if not _estado_disponible_obj:
        raise ValueError("Estado 'disponible' no configurado en la base de datos.")

    new_collar = Collar(
        codigo=codigo,
        estado_collar_id=_estado_disponible_obj.id,
        bateria=100.0,
        ultima_actividad=datetime.now(),
    )
    db.session.add(new_collar)
    db.session.flush()
    return new_collar

def _end_active_assignment(assignment):
    """Finaliza una asignación activa."""
    if assignment and assignment.fecha_fin is None:
        assignment.fecha_fin = datetime.now()
        db.session.add(assignment)

        old_collar = Collar.query.get(assignment.collar_id)
        if old_collar and old_collar.estado_collar_id not in [_estado_sin_bateria_obj.id, _estado_defectuoso_obj.id]:
            old_collar.estado_collar_id = _estado_disponible_obj.id
            db.session.add(old_collar)
    
def _create_new_assignment_logic(collar_id, animal_id, usuario_id):
    """Crea una nueva asignación de collar y pone el collar en estado 'activo'."""
    if not _estado_activo_obj:
        raise ValueError("Estado 'activo' no configurado en la base de datos.")

    new_assignment = AsignacionCollar(
        animal_id=animal_id,
        collar_id=collar_id,
        usuario_id=usuario_id,
        fecha_inicio=datetime.now(),
        fecha_fin=None,
    )
    db.session.add(new_assignment)

    collar = Collar.query.get(collar_id)
    if collar and collar.estado_collar_id != _estado_activo_obj.id:
        collar.estado_collar_id = _estado_activo_obj.id
        db.session.add(collar)
    return new_assignment

def _assign_collar(collar, animal_to_assign, current_user_id):
    """
    Gestiona la asignación de un collar a un animal.
    Finaliza asignaciones previas si es necesario.
    """
    # 1. Finalizar asignación activa del COLLAR (si este collar ya estaba asignado)
    current_collar_assignment = AsignacionCollar.query.filter_by(
        collar_id=collar.id, fecha_fin=None
    ).first()
    _end_active_assignment(current_collar_assignment)

    # 2. Si hay un animal_to_assign, asignarlo
    if animal_to_assign:
        # Finalizar cualquier asignación activa del ANIMAL (si el animal ya tiene otro collar)
        existing_animal_assignment = AsignacionCollar.query.filter_by(
            animal_id=animal_to_assign.id, fecha_fin=None
        ).first()
        _end_active_assignment(existing_animal_assignment)

        # Crear la nueva asignación
        _create_new_assignment_logic(collar.id, animal_to_assign.id, current_user_id)
    else: # Si animal_to_assign es None, el collar queda desasignado y pasa a disponible
        if collar.estado_collar_id not in [_estado_sin_bateria_obj.id, _estado_defectuoso_obj.id]:
            collar.estado_collar_id = _estado_disponible_obj.id
            db.session.add(collar)

# -----------------------------
# 1. Obtener lista completa de collares
# -----------------------------
@collares.route("/", methods=["GET"])
@login_required
def api_collares_list_full():
    collares_query = (
        db.session.query(
            Collar,
            Animal.id.label("animal_id"),
            Animal.nombre.label("animal_nombre"),
            EstadoCollar.nombre.label("estado_nombre"),
        )
        .outerjoin(
            AsignacionCollar,
            (Collar.id == AsignacionCollar.collar_id)
            & (AsignacionCollar.fecha_fin.is_(None)),
        )
        .outerjoin(Animal, AsignacionCollar.animal_id == Animal.id)
        .join(EstadoCollar, Collar.estado_collar_id == EstadoCollar.id)
        .all()
    )

    result = []
    for collar, animal_id, animal_nombre, estado_nombre in collares_query:
        result.append(
            {
                "id": collar.id,
                "codigo": collar.codigo,
                "estado": estado_nombre,
                "bateria": collar.bateria,
                "ultima_actividad": (
                    collar.ultima_actividad.isoformat()
                    if collar.ultima_actividad
                    else None
                ),
                "animal_id": animal_id,
                "animal_nombre": animal_nombre,
            }
        )
    return jsonify(result)


# -----------------------------
# 2. Obtener collares disponibles (Solo collares en estado 'disponible')
# -----------------------------
@collares.route("/available", methods=["GET"])
@login_required
def api_collares_disponibles():
    if not _estado_disponible_obj:
        return (
            jsonify(
                {
                    "status": "error",
                    "message": "Estado 'disponible' no encontrado en la DB. Recargue la aplicación o contacte al administrador.",
                }
            ),
            500,
        )

    assigned_collar_ids = (
        db.session.query(AsignacionCollar.collar_id)
        .filter(AsignacionCollar.fecha_fin.is_(None))
        .subquery()
    )

    disponibles = (
        db.session.query(Collar)
        .filter(
            ~Collar.id.in_(assigned_collar_ids),
            Collar.estado_collar_id == _estado_disponible_obj.id,
        )
        .all()
    )

    result = []
    for c in disponibles:
        result.append(
            {
                "id": c.id,
                "codigo": c.codigo,
                "estado": get_estado_collar_nombre(c.estado_collar_id),
                "bateria": c.bateria,
                "ultima_actividad": (
                    c.ultima_actividad.isoformat() if c.ultima_actividad else None
                ),
            }
        )
    return jsonify(result)


# -----------------------------
# 3. Crear collares en lote (Siempre en estado DISPONIBLE)
# -----------------------------
@collares.route("/", methods=["POST"])
@login_required
def api_collares_create_batch():
    data = request.get_json()

    identificador_base = data.get("identificador")
    cantidad_a_crear = data.get("cantidad")

    if not identificador_base:
        return (
            jsonify(
                {
                    "status": "error",
                    "message": "El identificador base del collar es obligatorio.",
                }
            ),
            400,
        )
    if not isinstance(cantidad_a_crear, int) or cantidad_a_crear <= 0:
        return (
            jsonify(
                {
                    "status": "error",
                    "message": "La cantidad debe ser un número entero positivo.",
                }
            ),
            400,
        )
    
    if not _estado_disponible_obj: 
        return jsonify({"status": "error", "message": "Estado 'disponible' no encontrado en la DB. Recargue la aplicación o contacte al administrador."}), 500

    try:
        existing_collars = Collar.query.filter(
            Collar.codigo.like(f"{identificador_base}-%")
        ).all()

        last_sequence_number = 0
        for collar_existente in existing_collars:
            match = re.search(r"-(\d+)$", collar_existente.codigo)
            if match:
                sequence = int(match.group(1))
                if sequence > last_sequence_number:
                    last_sequence_number = sequence

        start_sequence_from = last_sequence_number + 1
        end_sequence_at = start_sequence_from + cantidad_a_crear - 1

        new_collars = []
        for i in range(start_sequence_from, end_sequence_at + 1):
            # Reutiliza la función auxiliar para crear el collar
            new_collar_obj = _create_new_collar_logic(f"{identificador_base}-{i}")
            new_collars.append(new_collar_obj)

        db.session.commit()

        return (
            jsonify(
                {
                    "status": "success",
                    "message": f"Se han creado {cantidad_a_crear} collares con identificador base '{identificador_base}'.",
                    "first_code": f"{identificador_base}-{start_sequence_from}",
                    "last_code": f"{identificador_base}-{end_sequence_at}",
                }
            ),
            201,
        )

    except Exception as e:
        db.session.rollback()
        return (
            jsonify(
                {
                    "status": "error",
                    "message": "Error interno del servidor al crear collares: " + str(e),
                }
            ),
            500,
        )


# -----------------------------
# 4. Obtener detalles de un collar específico
# -----------------------------
@collares.route("/<int:collar_id>", methods=["GET"])
@login_required
def api_collares_details(collar_id):
    collar = Collar.query.get(collar_id)
    if not collar:
        return jsonify({"status": "error", "message": "Collar no encontrado"}), 404

    asignacion_activa = AsignacionCollar.query.filter_by(
        collar_id=collar_id, fecha_fin=None
    ).first()
    animal_data = None
    if asignacion_activa and asignacion_activa.animal_id:
        animal = Animal.query.get(asignacion_activa.animal_id)
        if animal:
            animal_data = {
                "id": animal.id,
                "nombre": animal.nombre,
                "numero_identificacion": animal.numero_identificacion,
            }

    estado_nombre = get_estado_collar_nombre(collar.estado_collar_id)

    return (
        jsonify(
            {
                "id": collar.id,
                "codigo": collar.codigo,
                "estado": estado_nombre,
                "bateria": collar.bateria,
                "ultima_actividad": (
                    collar.ultima_actividad.isoformat()
                    if collar.ultima_actividad
                    else None
                ),
                "animal_id": asignacion_activa.animal_id if asignacion_activa else None,
                "animal_nombre": animal_data["nombre"] if animal_data else None,
                "animal_info": animal_data,
            }
        ),
        200,
    )


# -----------------------------
# 5. Actualizar un collar (estado y batería, y asignación de animal)
# -----------------------------
@collares.route("/<int:collar_id>", methods=["PUT", "PATCH"])
@login_required
def api_collares_update(collar_id):
    collar = Collar.query.get_or_404(collar_id)
    data = request.get_json()

    changed = False

    if not all([_estado_activo_obj, _estado_sin_bateria_obj, _estado_disponible_obj, _estado_defectuoso_obj]):
        return (
            jsonify(
                {
                    "status": "error",
                    "message": "Configuración de estados de collar inválida en la DB. Recargue la aplicación o contacte al administrador.",
                }
            ),
            500,
        )

    if "estado" in data:
        new_estado_nombre = data["estado"].lower()
        new_estado_obj = _estados_collar_map.get(new_estado_nombre)

        if new_estado_obj is None:
            return (
                jsonify(
                    {
                        "status": "error",
                        "message": f"Estado '{new_estado_nombre}' no válido.",
                    }
                ),
                400,
            )

        if new_estado_obj.id == _estado_activo_obj.id:
            return (
                jsonify(
                    {
                        "status": "error",
                        "message": "El estado 'Activo' se gestiona automáticamente por asignación.",
                    }
                ),
                400,
            )
        if new_estado_obj.id == _estado_sin_bateria_obj.id:
            return (
                jsonify(
                    {
                        "status": "error",
                        "message": "El estado 'Sin Batería' no puede ser asignado directamente.",
                    }
                ),
                400,
            )

        if collar.estado_collar_id != new_estado_obj.id:
            collar.estado_collar_id = new_estado_obj.id
            changed = True

    if "bateria" in data:
        nueva_bateria = float(data["bateria"]) if data["bateria"] is not None else None
        if collar.bateria != nueva_bateria:
            collar.bateria = nueva_bateria
            changed = True

    if changed or (
        collar.ultima_actividad is None or collar.ultima_actividad < datetime.now()
    ):
        collar.ultima_actividad = datetime.now()
        if not changed:
            changed = True

    if not changed:
        return (
            jsonify(
                {
                    "status": "info",
                    "message": "No se detectaron cambios para actualizar.",
                }
            ),
            200,
        )

    db.session.add(collar)

    try:
        db.session.commit()
        return (
            jsonify(
                {"status": "success", "message": "Collar actualizado correctamente."}
            ),
            200,
        )
    except Exception as e:
        db.session.rollback()
        return (
            jsonify(
                {
                    "status": "error",
                    "message": "Error interno del servidor al actualizar collar: " + str(e),
                }
            ),
            500,
        )


# -----------------------------
# 6. Eliminar un collar (Ahora permite eliminar incluso si está asignado)
# -----------------------------
@collares.route("/<int:collar_id>", methods=["DELETE"])
@login_required
def api_collares_delete(collar_id):
    collar = Collar.query.get_or_404(collar_id)

    try:
        db.session.delete(collar)
        db.session.commit()
        return (
            jsonify(
                {
                    "status": "success",
                    "message": "Collar eliminado correctamente. Cualquier asignación activa ha sido desvinculada.",
                }
            ),
            200,
        )
    except Exception as e:
        db.session.rollback()
        return (
            jsonify(
                {
                    "status": "error",
                    "message": "Error interno del servidor al eliminar collar: " + str(e),
                }
            ),
            500,
        )


# -----------------------------
# 7. Asignar/Reasignar/Desasignar un collar a un animal
# -----------------------------
@collares.route("/<int:collar_id>/assign", methods=["POST"])
@login_required
def api_collar_handle_assignment(collar_id):
    data = request.get_json()
    animal_id = data.get("animal_id")

    if not all([_estado_activo_obj, _estado_disponible_obj, _estado_sin_bateria_obj, _estado_defectuoso_obj]):
        return (
            jsonify(
                {
                    "status": "error",
                    "message": "Estados de collar mal configurados en base de datos. Recargue la aplicación o contacte al administrador.",
                }
            ),
            500,
        )

    collar = Collar.query.get(collar_id)
    if not collar:
        return jsonify({"status": "error", "message": "Collar no encontrado."}), 404

    try:
        # Validación: Solo collares en estado DISPONIBLE o ACTIVO pueden ser reasignados/asignados
        if collar.estado_collar_id not in [_estado_disponible_obj.id, _estado_activo_obj.id]:
            return jsonify({"status": "error", "message": "Solo collares en estado 'disponible' o ya 'activo' pueden ser asignados/reasignados."}), 400

        animal_obj = None
        if animal_id:
            animal_obj = Animal.query.get(animal_id)
            if not animal_obj:
                return jsonify({"status": "error", "message": "Animal no encontrado."}), 404
            # Verificar autorización del animal si el usuario es el dueño de su campo
            if animal_obj.parcela and animal_obj.parcela.campo.usuario_id != current_user.id:
                return jsonify({"status": "error", "message": "No autorizado para asignar este animal."}), 403

        # Lógica centralizada para manejar la asignación
        _assign_collar(collar, animal_obj, current_user.id)
        db.session.commit()

        if animal_obj:
            return jsonify({"status": "success", "message": f"Collar {collar.codigo} asignado a {animal_obj.nombre}."}), 200
        else:
            return jsonify({"status": "success", "message": f"Collar {collar.codigo} desasignado correctamente."}), 200

    except Exception as e:
        db.session.rollback()
        return (
            jsonify({"status": "error", "message": f"Error interno del servidor: {str(e)}"})
            , 500
        )


# -----------------------------
# 8. Obtener lista completa de estados de collar
# -----------------------------
@collares.route("/estados", methods=["GET"])
@login_required
def api_collares_estados():
    estados = EstadoCollar.query.all()
    result = [{"id": estado.id, "nombre": estado.nombre} for estado in estados]
    return jsonify(result)


# -------------------------------------------------------------
# RUTAS Y LÓGICA PARA IMPORTACIÓN Y EXPORTACIÓN DE COLLARES
# -------------------------------------------------------------

# Headers para la plantilla y exportación de Collares (solo los campos que el usuario puede tocar)
COLLAR_CSV_HEADERS = {
    "codigo": "Codigo",
    "animal_numero_identificacion": "ID Animal Asignado (opcional)",
}

@collares.route("/export/template", methods=["GET"])
@login_required
def api_collares_export_template():
    """
    Exporta una plantilla CSV con los headers de collares.
    """
    output = StringIO()
    writer = csv.writer(output)
    
    writer.writerow(COLLAR_CSV_HEADERS.values())
    
    # Fila de ejemplo con instrucciones o datos dummy
    example_row = ["COD-XYZ", "ANIMAL-456"] # Ejemplo de asignación
    writer.writerow(example_row)
    example_row_2 = ["COLLAR-NUEVO-1", ""] # Ejemplo de creación de collar disponible
    writer.writerow(example_row_2)

    response = make_response(output.getvalue())
    output.close()
    response.headers["Content-Disposition"] = "attachment; filename=plantilla_collares.csv"
    response.headers["Content-type"] = "text/csv"
    return response


@collares.route("/import", methods=["POST"])
@login_required
def api_collares_import():
    """
    Importa collares desde un archivo CSV.
    Permite crear nuevos collares o actualizar existentes, y gestionar sus asignaciones.
    """
    if 'file' not in request.files:
        return jsonify({"status": "error", "message": "No se proporcionó ningún archivo."}), 400
    
    file = request.files['file']
    if not file.filename.endswith('.csv'):
        return jsonify({"status": "error", "message": "El archivo debe ser de tipo CSV."}), 400

    stream = StringIO(file.stream.read().decode("UTF8"))
    reader = csv.reader(stream)
    
    try:
        header_row = next(reader) # Lee la primera fila como headers
    except StopIteration:
        return jsonify({"status": "error", "message": "El archivo CSV está vacío."}), 400
    
    # Mapear headers del CSV a las claves internas usando COLLAR_CSV_HEADERS
    header_map = {}
    for internal_key, display_name in COLLAR_CSV_HEADERS.items():
        try:
            header_map[internal_key] = header_row.index(display_name)
        except ValueError:
            # 'codigo' es obligatorio para el procesamiento
            if internal_key == "codigo":
                return jsonify({"status": "error", "message": f"Columna '{display_name}' obligatoria no encontrada en el CSV."}), 400
            header_map[internal_key] = None # Campo opcional no encontrado

    # Asegurarse de que los estados de collar estén cargados
    if _estados_collar_map is None:
        _load_collar_states()
        if _estados_collar_map is None:
            return jsonify({"status": "error", "message": "Error interno del servidor: Los estados de collar no pudieron ser cargados."}), 500

    imported_count = 0
    updated_count = 0
    created_count = 0
    errors = []

    for row_idx, row in enumerate(reader):
        row_number = row_idx + 2 # +1 por 0-indexed, +1 por la fila de headers
        row_errors = []
        
        # Extraer datos de la fila según el mapeo de headers
        # Asegurarse de que `codigo` y `animal_numero_identificacion_str` siempre se obtengan, incluso si la columna no existe o la fila es corta
        codigo_col_idx = header_map.get("codigo")
        codigo = (row[codigo_col_idx].strip() if codigo_col_idx is not None and codigo_col_idx < len(row) else "").upper()
        
        animal_id_col_idx = header_map.get("animal_numero_identificacion")
        animal_numero_identificacion_str = (row[animal_id_col_idx].strip() if animal_id_col_idx is not None and animal_id_col_idx < len(row) else "").upper()

        if not codigo:
            row_errors.append({"field": "Código del Collar", "value": "", "message": "El código del collar no puede estar vacío."})
            errors.append({"row": row_number, "errors": row_errors})
            continue

        animal_to_assign = None
        if animal_numero_identificacion_str:
            animal_to_assign = get_animal_by_identificacion(animal_numero_identificacion_str)
            if not animal_to_assign:
                row_errors.append({"field": "ID Animal Asignado", "value": animal_numero_identificacion_str, "message": "Número de identificación de animal no encontrado o no autorizado para tu usuario."})
        
        if row_errors:
            errors.append({"row": row_number, "errors": row_errors})
            continue

        try:
            collar = Collar.query.filter_by(codigo=codigo).first()
            
            if collar: # Collar existente
                _assign_collar(collar, animal_to_assign, current_user.id)
                updated_count += 1
            else: # Nuevo collar
                new_collar = _create_new_collar_logic(codigo)
                
                if animal_to_assign:
                    _assign_collar(new_collar, animal_to_assign, current_user.id)

                created_count += 1
            
            imported_count += 1
            db.session.flush()

        except IntegrityError as ie:
            db.session.rollback()
            row_errors.append({"field": "General", "value": f"Código: {codigo}", "message": f"Error de duplicado o restricción de BD: {str(ie)}"})
            errors.append({"row": row_number, "errors": row_errors})
            continue
        except Exception as e:
            db.session.rollback()
            row_errors.append({"field": "General", "value": f"Código: {codigo}", "message": f"Error al procesar la fila: {str(e)}"})
            errors.append({"row": row_number, "errors": row_errors})
            continue

    db.session.commit()

    return jsonify({
        "status": "success" if not errors else "partial_success",
        "message": f"Proceso de importación finalizado. Creados: {created_count}, Actualizados: {updated_count}, Errores: {len(errors)}.",
        "summary": {
            "total_processed": imported_count,
            "created": created_count,
            "updated": updated_count,
            "errors_count": len(errors)
        },
        "errors": errors
    }), 200 if not errors else 207


@collares.route("/export", methods=["GET"])
@login_required
def api_collares_export():
    """
    Exporta datos de collares a CSV según tipo (all, filtered, page, selected).
    """
    export_type = request.args.get('type', 'all')
    
    collares_query = db.session.query(
        Collar,
        Animal.numero_identificacion.label('animal_numero_identificacion'),
    ).outerjoin(
        AsignacionCollar,
        (Collar.id == AsignacionCollar.collar_id) & (AsignacionCollar.fecha_fin.is_(None))
    ).outerjoin(
        Animal,
        AsignacionCollar.animal_id == Animal.id
    )

    if export_type == 'filtered':
        global_filter = request.args.get('globalFilter')
        if global_filter:
            search_term = f"%{global_filter.lower()}%"
            collares_query = collares_query.filter(
                (Collar.codigo.ilike(search_term)) |
                (Animal.numero_identificacion.ilike(search_term))
            )

    elif export_type == 'selected':
        selected_ids_str = request.args.get('ids')
        if not selected_ids_str:
            return jsonify({"status": "error", "message": "IDs de collares seleccionados no proporcionados."}), 400
        selected_ids = [int(x) for x in selected_ids_str.split(',') if x.isdigit()]
        collares_query = collares_query.filter(Collar.id.in_(selected_ids))
    
    collares_data = collares_query.all()
    
    output = StringIO()
    writer = csv.writer(output)

    headers = list(COLLAR_CSV_HEADERS.values())
    writer.writerow(headers)

    for collar, animal_numero_identificacion in collares_data:
        row = [
            collar.codigo,
            animal_numero_identificacion if animal_numero_identificacion else '',
        ]
        writer.writerow(row)

    response = make_response(output.getvalue())
    output.close()
    response.headers["Content-Disposition"] = f"attachment; filename=collares_{export_type}.csv"
    response.headers["Content-type"] = "text/csv"
    return response
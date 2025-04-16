from database.scripts.insert.insert import insert_data
# from database.scripts.generate.generar_datos import generar_clases_totales, generar_examenes, poblar_clases_programadas
# from database.scripts.generate.generar_examen_notas import cargar_notas_examenes, cargar_obligaciones
# from database.scripts.insert.insert_inscripciones import cargar_inscripciones
# from database.scripts.generate.generar_asistencias import generar_asistencias

def load_data():
    insert_data()
    # generar_clases_totales()
    # poblar_clases_programadas(2024)
    # cargar_inscripciones()
    # generar_examenes()
    # cargar_notas_examenes()
    # cargar_obligaciones()
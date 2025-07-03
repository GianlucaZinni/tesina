CREATE DEFINER=`root`@`localhost` PROCEDURE `MarcarFaltas`(IN dia_parametro DATE)
BEGIN
    DECLARE ciclo_inicio DATE;
    DECLARE ciclo_fin DATE;
    DECLARE dia_actual DATE;

    -- Determinar el día para marcar faltas
    IF dia_parametro IS NOT NULL THEN
        SET dia_actual = dia_parametro;
    ELSE
        SET dia_actual = DATE(CONVERT_TZ(NOW(), @@session.time_zone, '-03:00'));
    END IF;

    -- Verificar si el día está dentro del plazo de un ciclo activo
    SELECT inicio, fin INTO ciclo_inicio, ciclo_fin
    FROM ciclos
    WHERE dia_actual BETWEEN inicio AND fin
    LIMIT 1;

    -- Solo proceder si se encuentra un ciclo activo
    IF ciclo_inicio IS NOT NULL AND ciclo_fin IS NOT NULL THEN
        -- Insertar faltas para los alumnos que no tengan asistencia registrada para el día específico
        INSERT INTO asistencias_regulares (fecha, id_alumno, llegada, condicion, estado)
        SELECT dia_actual, a.id_alumno, NULL, 'FALTA', 0
        FROM alumnos a
        WHERE NOT EXISTS (
            SELECT 1
            FROM asistencias_regulares ar
            WHERE ar.id_alumno = a.id_alumno
            AND ar.fecha = dia_actual
        );
    END IF;
END
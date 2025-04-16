DELIMITER $$

CREATE DEFINER=`root`@`localhost` PROCEDURE `ProcesarAsistencia`()
BEGIN
    DECLARE done INT DEFAULT 0;
    DECLARE alumno_id INT;
    DECLARE asistencia_fecha DATE;
    DECLARE asistencia_hora_exacta BIGINT;

    DECLARE v_turno_inicio TIME; 
    DECLARE v_ciclo_inicio DATE;
    DECLARE v_ciclo_fin DATE;

    -- Cursor para recorrer las asistencias diarias
    DECLARE asistencia_cursor CURSOR FOR
    SELECT id_alumno, fecha, hora_exacta
    FROM asistencias_diarias
    ORDER BY id_alumno, fecha, hora_exacta;

    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = 1;

    -- Abrir el cursor
    OPEN asistencia_cursor;

    read_loop: LOOP
        FETCH asistencia_cursor INTO alumno_id, asistencia_fecha, asistencia_hora_exacta;
        IF done THEN
            LEAVE read_loop;
        END IF;

        -- Calcular el tiempo de llegada
        SET @hora_llegada = FROM_UNIXTIME(asistencia_hora_exacta / 1000);

        -- Obtener el turno del alumno basado en el ciclo y configuración de carrera
        SELECT 
            t.inicio INTO v_turno_inicio
        FROM 
            alumnos_por_carrera apc
        JOIN 
            carrera_config cc ON cc.id_carrera = apc.id_carrera
        JOIN 
            turnos t ON cc.id_turno = t.id_turno
        WHERE 
            apc.id_alumno = alumno_id
        AND 
            cc.carrera_anio = (
                SELECT MAX(m.anio_cursada)
                FROM inscripciones i
                JOIN materias m ON i.id_materia = m.id_materia
                WHERE i.id_alumno = alumno_id
            )
        LIMIT 1;

        -- Obtener información del ciclo actual del alumno
        SELECT 
            c.inicio AS ciclo_inicio, 
            c.fin AS ciclo_fin
        INTO 
            v_ciclo_inicio, 
            v_ciclo_fin
        FROM 
            inscripciones i
        JOIN 
            ciclos c ON i.id_ciclo = c.id_ciclo
        WHERE 
            i.id_alumno = alumno_id
        ORDER BY 
            c.inicio DESC
        LIMIT 1;

        -- Determinar condición y estado
        IF asistencia_fecha < v_ciclo_inicio OR asistencia_fecha > v_ciclo_fin THEN
            SET @condicion = 'SIN CLASE';
            SET @estado = 0;
        ELSE
            -- Calcular diferencia en minutos entre hora_llegada y turno_inicio
            SET @minutos_diferencia = HOUR(@hora_llegada) * 60 + MINUTE(@hora_llegada) - (HOUR(v_turno_inicio) * 60 + MINUTE(v_turno_inicio));

            IF @minutos_diferencia BETWEEN -30 AND 15 THEN
                SET @condicion = 'PRESENTE';
                SET @estado = 1;
            ELSEIF @minutos_diferencia < -30 THEN
                SET @condicion = 'ANTES DE TIEMPO';
                SET @estado = 1;
            ELSEIF @minutos_diferencia > 15 THEN
                SET @condicion = 'TARDE';
                SET @estado = 1;
            END IF;
        END IF;

        -- Verificar si ya existe un registro para este alumno en asistencias_regulares
        IF EXISTS (
            SELECT 1
            FROM asistencias_regulares
            WHERE id_alumno = alumno_id
            AND fecha = asistencia_fecha
        ) THEN
            -- Si existe, comparar cuál llegada está más cerca del turno inicio
            SELECT 
                llegada
            INTO 
                @hora_existente
            FROM 
                asistencias_regulares
            WHERE 
                id_alumno = alumno_id
                AND fecha = asistencia_fecha
            LIMIT 1;

            SET @diferencia_existente = ABS(HOUR(@hora_existente) * 60 + MINUTE(@hora_existente) - (HOUR(v_turno_inicio) * 60 + MINUTE(v_turno_inicio)));
            SET @diferencia_nueva = ABS(@minutos_diferencia);

            -- Si la nueva asistencia es más cercana al turno inicio, actualizar el registro
            IF @diferencia_nueva < @diferencia_existente THEN
                UPDATE asistencias_regulares
                SET 
                    llegada = TIME(@hora_llegada),
                    condicion = @condicion,
                    estado = @estado
                WHERE 
                    id_alumno = alumno_id
                    AND fecha = asistencia_fecha;
            END IF;

        ELSE
            -- Si no existe, insertar el nuevo registro
            INSERT INTO asistencias_regulares (
                fecha,
                id_alumno,
                llegada,
                condicion,
                estado
            )
            VALUES (
                asistencia_fecha,
                alumno_id,
                TIME(@hora_llegada),
                @condicion,
                @estado
            );
        END IF;

        -- Eliminar la asistencia procesada
        DELETE FROM asistencias_diarias
        WHERE 
            id_alumno = alumno_id
            AND fecha = asistencia_fecha
            AND hora_exacta = asistencia_hora_exacta;
    END LOOP;

    CLOSE asistencia_cursor;

END$$

DELIMITER ;

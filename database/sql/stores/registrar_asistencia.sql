CREATE DEFINER=`root`@`localhost` PROCEDURE `RegistrarAsistencia`(
    IN p_timestamp BIGINT,
    IN p_id_alumno INT
)
BEGIN
    -- Insertar un registro en la tabla asistencias_diarias
    INSERT INTO asistencias_diarias (
        id_alumno,
        fecha,
        asunto,
        hora_exacta
    )
    VALUES (
        p_id_alumno,                        -- ID del alumno
        DATE(FROM_UNIXTIME(p_timestamp / 1000)), -- Convertir milisegundos a fecha
        'A',                                -- Valor fijo para "asunto"
        p_timestamp                         -- Hora exacta en milisegundos
    );
END
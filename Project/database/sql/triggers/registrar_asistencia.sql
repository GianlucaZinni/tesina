CREATE TRIGGER trigger_register_asistencia
AFTER INSERT ON radpostauth
FOR EACH ROW
BEGIN
    DECLARE v_id_alumno INT;

    -- Log: Iniciando procesamiento del trigger
    INSERT INTO trigger_logs (log_message)
    VALUES (CONCAT('Procesando username: ', NEW.username, ', reply: ', NEW.reply, ', authdate: ', NEW.authdate));

    -- Validar que el reply sea 'Access-Accept'
    IF NEW.reply = 'Access-Accept' THEN
        -- Obtener el id_alumno asociado al username
        SELECT a.id_alumno INTO v_id_alumno
        FROM alumnos a
        JOIN radcheck r ON a.id = r.id
        WHERE r.username = NEW.username
        LIMIT 1;

        -- Log: Verificar si se encontró el id_alumno
        IF v_id_alumno IS NOT NULL THEN
            INSERT INTO trigger_logs (log_message)
            VALUES (CONCAT('id_alumno encontrado: ', v_id_alumno, ' para username: ', NEW.username));

            -- Llamar al procedimiento almacenado
            CALL RegistrarAsistencia(
                UNIX_TIMESTAMP(NEW.authdate) * 1000, -- Timestamp en milisegundos
                v_id_alumno                          -- ID del alumno
            );

            -- Log: Procedimiento llamado con éxito
            INSERT INTO trigger_logs (log_message)
            VALUES (CONCAT('Procedimiento RegistrarAsistencia llamado para id_alumno: ', v_id_alumno));
        ELSE
            -- Log: No se encontró id_alumno
            INSERT INTO trigger_logs (log_message)
            VALUES (CONCAT('No se encontró id_alumno para username: ', NEW.username));
        END IF;
    ELSE
        -- Log: El reply no es 'Access-Accept'
        INSERT INTO trigger_logs (log_message)
        VALUES (CONCAT('Registro ignorado porque reply es: ', NEW.reply));
    END IF;
END

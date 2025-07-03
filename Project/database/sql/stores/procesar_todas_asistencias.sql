CREATE DEFINER=`root`@`localhost` PROCEDURE `ProcesarTodasAsistencias`()
BEGIN
    DECLARE registros_restantes INT;
    -- Etiquetar el bucle WHILE
    procesar_bucle: WHILE TRUE DO
        -- Contar los registros restantes en asistencias_diarias
        SELECT COUNT(*) INTO registros_restantes
        FROM asistencias_diarias;

        -- Si no hay más registros, salir del bucle
        IF registros_restantes = 0 THEN
            LEAVE procesar_bucle;
        END IF;

        -- Ejecutar el procedimiento ProcesarAsistencias
        CALL ProcesarAsistencia();
    END WHILE procesar_bucle;
END
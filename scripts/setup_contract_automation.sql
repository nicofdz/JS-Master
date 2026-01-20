-- ALERTA: Ejecuta este script en el SQL Editor de Supabase para automatizar la finalización de contratos.

-- 1. Habilitar la extensión pg_cron (si no está activa)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Crear la función que actualiza los contratos vencidos
CREATE OR REPLACE FUNCTION handle_expired_contracts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Actualizar contratos cuyo fecha_termino ya pasó y siguen activos
  UPDATE contract_history
  SET 
    status = 'finalizado',
    updated_at = NOW()
  WHERE 
    status = 'activo' 
    AND is_active = true 
    AND fecha_termino < CURRENT_DATE;
END;
$$;

-- 3. Programar el CRON para ejecutarse todos los días a las 00:01 AM (Hora UTC)
-- Nota: pg_cron usa hora UTC. Ajusta según sea necesario.
-- El formato es: minuto hora día mes día_semana
SELECT cron.schedule(
  'finalizar-contratos-vencidos', -- Nombre del trabajo
  '1 0 * * *',                   -- A las 00:01 todos los días
  $$SELECT handle_expired_contracts()$$
);

-- 4. Verificar que se creó
SELECT * FROM cron.job;

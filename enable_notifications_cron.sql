-- Función para verificar contratos por vencer y tareas atrasadas
-- Correr este script en el Editor SQL de Supabase

CREATE OR REPLACE FUNCTION check_daily_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    target_user_id uuid;
    r RECORD;
    d_days integer;
    msg text;
    link_url text;
    TARGET_ROLES text[] := ARRAY['admin', 'supervisor'];
BEGIN
    -- 1. REVISAR CONTRATOS POR VENCER (7, 3, 1 dias antes, y 0 para hoy)
    FOR r IN
        SELECT 
            ch.id, ch.fecha_termino, w.full_name as worker_name,
            (ch.fecha_termino - CURRENT_DATE) as days_left
        FROM contract_history ch
        JOIN workers w ON ch.worker_id = w.id
        WHERE ch.is_active = true 
        AND ch.fecha_termino IS NOT NULL
        AND (ch.fecha_termino - CURRENT_DATE) IN (7, 3, 1, 0)
    LOOP
        -- Construir mensaje
        IF r.days_left = 0 THEN
             msg := 'El contrato de ' || r.worker_name || ' vence HOY';
        ELSE
             msg := 'El contrato de ' || r.worker_name || ' vence en ' || r.days_left || ' días';
        END IF;

        link_url := '/trabajadores?contract=' || r.id;

        -- Notificar a Admins y Supervisores
        FOR target_user_id IN SELECT id FROM user_profiles WHERE role = ANY(TARGET_ROLES)
        LOOP
            INSERT INTO notifications (user_id, type, title, message, link, metadata, related_table, related_id)
            SELECT 
                target_user_id, 
                'contract_expiring', 
                'Contrato por Vencer', 
                msg, 
                link_url, 
                jsonb_build_object('contract_id', r.id, 'days_until_expiry', r.days_left),
                'contract_history',
                r.id
            WHERE NOT EXISTS (
                SELECT 1 FROM notifications 
                WHERE user_id = target_user_id 
                AND related_table = 'contract_history' 
                AND related_id = r.id 
                AND type = 'contract_expiring'
                AND created_at > (now() - interval '18 hours') -- Evitar duplicados el mismo día
            );
        END LOOP;
    END LOOP;

    -- 2. REVISAR CONTRATOS EXPIRADOS (Ayer, -1)
    FOR r IN
        SELECT 
            ch.id, w.full_name as worker_name
        FROM contract_history ch
        JOIN workers w ON ch.worker_id = w.id
        WHERE ch.is_active = true -- Técnicamente activo hasta que se cancele manualmente o por script
        AND ch.fecha_termino = (CURRENT_DATE - 1)
    LOOP
         msg := 'El contrato de ' || r.worker_name || ' ha expirado';
         link_url := '/trabajadores?contract=' || r.id;

         FOR target_user_id IN SELECT id FROM user_profiles WHERE role = ANY(TARGET_ROLES)
         LOOP
            INSERT INTO notifications (user_id, type, title, message, link, metadata, related_table, related_id)
            SELECT 
                target_user_id, 
                'contract_expired', 
                'Contrato Expirado', 
                msg, 
                link_url, 
                jsonb_build_object('contract_id', r.id),
                'contract_history',
                r.id
            WHERE NOT EXISTS (
                SELECT 1 FROM notifications 
                WHERE user_id = target_user_id 
                AND related_table = 'contract_history' 
                AND related_id = r.id 
                AND type = 'contract_expired'
            );
         END LOOP;
    END LOOP;

    -- 3. REVISAR TAREAS ATRASADAS (Atrasadas por 1, 3, 7, 14, 30 días)
    FOR r IN
        SELECT 
            t.id, t.task_name, t.end_date, a.apartment_number,
            (CURRENT_DATE - t.end_date) as days_overdue
        FROM tasks t
        JOIN apartments a ON t.apartment_id = a.id
        WHERE t.status != 'completed' AND t.status != 'cancelled'
        AND t.end_date < CURRENT_DATE
        AND (CURRENT_DATE - t.end_date) IN (1, 3, 7, 14, 30)
    LOOP
        msg := 'La tarea "' || r.task_name || '" en depto ' || r.apartment_number || ' está atrasada ' || r.days_overdue || ' días';
        link_url := '/tareas?id=' || r.id;

        FOR target_user_id IN SELECT id FROM user_profiles WHERE role = ANY(TARGET_ROLES)
        LOOP
            INSERT INTO notifications (user_id, type, title, message, link, metadata, related_table, related_id)
            SELECT 
                target_user_id, 
                'task_delayed', 
                'Tarea Atrasada', 
                msg, 
                link_url, 
                jsonb_build_object('task_id', r.id, 'days_delayed', r.days_overdue),
                'tasks',
                r.id
            WHERE NOT EXISTS (
                SELECT 1 FROM notifications 
                WHERE user_id = target_user_id 
                AND related_table = 'tasks' 
                AND related_id = r.id 
                AND type = 'task_delayed'
                AND created_at > (now() - interval '18 hours')
            );
        END LOOP;
    END LOOP;

END;
$$;

-- Desprogramar solo si existe (evita error si es la primera vez)
SELECT cron.unschedule(jobid) 
FROM cron.job 
WHERE jobname = 'daily-notifications-job';

SELECT cron.schedule(
    'daily-notifications-job',
    '0 12 * * *', -- 12:00 UTC = 09:00 Chile (aprox)
    'SELECT check_daily_notifications()'
);

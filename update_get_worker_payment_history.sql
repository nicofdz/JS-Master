DROP FUNCTION IF EXISTS get_worker_payment_history(INTEGER);

CREATE OR REPLACE FUNCTION get_worker_payment_history(p_worker_id INTEGER)
RETURNS TABLE (
    payment_id INTEGER,
    payment_date DATE,
    total_amount DECIMAL(10,2),
    tasks_count INTEGER,
    work_days INTEGER,
    payment_status VARCHAR(20),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    project_name TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        wph.id,
        wph.payment_date,
        wph.total_amount,
        wph.tasks_count,
        wph.work_days,
        wph.payment_status,
        wph.notes,
        wph.created_at,
        COALESCE(
            p.name, 
            (
                SELECT pr.name
                FROM public.payment_task_assignments pta
                JOIN public.task_assignments ta ON pta.task_assignment_id = ta.id
                JOIN public.tasks t ON ta.task_id = t.id
                JOIN public.apartments a ON t.apartment_id = a.id
                JOIN public.floors f ON a.floor_id = f.id
                JOIN public.projects pr ON f.project_id = pr.id
                WHERE pta.payment_id = wph.id
                LIMIT 1
            ),
            'Sin Proyecto'
        ) as project_name
    FROM public.worker_payment_history wph
    LEFT JOIN public.projects p ON wph.project_id = p.id
    WHERE wph.worker_id = p_worker_id
    ORDER BY wph.payment_date DESC;
END;
$$ LANGUAGE plpgsql;

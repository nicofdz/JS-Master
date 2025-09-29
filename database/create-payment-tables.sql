-- =====================================================
-- CREAR TABLAS DE HISTORIAL DE PAGOS
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- Crear tabla worker_payment_history
CREATE TABLE IF NOT EXISTS public.worker_payment_history (
    id SERIAL PRIMARY KEY,
    worker_id INTEGER REFERENCES public.workers(id) ON DELETE CASCADE,
    payment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    amount_paid DECIMAL(10,2) NOT NULL,
    days_worked INTEGER,
    notes TEXT,
    paid_by UUID REFERENCES public.user_profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear tabla payment_tasks (tabla de relación)
CREATE TABLE IF NOT EXISTS public.payment_tasks (
    payment_id INTEGER REFERENCES public.worker_payment_history(id) ON DELETE CASCADE,
    task_id INTEGER REFERENCES public.apartment_tasks(id) ON DELETE CASCADE,
    PRIMARY KEY (payment_id, task_id)
);

-- Crear índices para mejorar performance
CREATE INDEX IF NOT EXISTS idx_worker_payment_history_worker_id ON public.worker_payment_history(worker_id);
CREATE INDEX IF NOT EXISTS idx_worker_payment_history_payment_date ON public.worker_payment_history(payment_date);
CREATE INDEX IF NOT EXISTS idx_payment_tasks_payment_id ON public.payment_tasks(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_tasks_task_id ON public.payment_tasks(task_id);

-- Comentarios para las tablas
COMMENT ON TABLE public.worker_payment_history IS 'Historial de pagos realizados a trabajadores';
COMMENT ON TABLE public.payment_tasks IS 'Relación entre pagos y tareas incluidas en cada pago';






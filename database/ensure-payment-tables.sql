-- =====================================================
-- ASEGURAR QUE LAS TABLAS DE PAGOS EXISTAN
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- Verificar si las tablas existen
SELECT 'Tablas existentes:' as status;
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('worker_payment_history', 'payment_tasks', 'payment_updates_log');

-- Crear tabla worker_payment_history si no existe
CREATE TABLE IF NOT EXISTS public.worker_payment_history (
    id SERIAL PRIMARY KEY,
    worker_id INTEGER REFERENCES public.workers(id) ON DELETE CASCADE,
    payment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    total_amount DECIMAL(10,2) NOT NULL,
    tasks_count INTEGER DEFAULT 0,
    work_days INTEGER DEFAULT 0,
    payment_status VARCHAR(50) DEFAULT 'completed',
    notes TEXT,
    created_by UUID REFERENCES public.user_profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear tabla payment_tasks si no existe
CREATE TABLE IF NOT EXISTS public.payment_tasks (
    payment_id INTEGER REFERENCES public.worker_payment_history(id) ON DELETE CASCADE,
    task_id INTEGER REFERENCES public.apartment_tasks(id) ON DELETE CASCADE,
    PRIMARY KEY (payment_id, task_id)
);

-- Crear tabla payment_updates_log si no existe
CREATE TABLE IF NOT EXISTS public.payment_updates_log (
    id SERIAL PRIMARY KEY,
    payment_id INTEGER REFERENCES public.worker_payment_history(id) ON DELETE CASCADE,
    old_amount DECIMAL(10,2),
    new_amount DECIMAL(10,2),
    updated_by UUID REFERENCES public.user_profiles(id),
    update_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices si no existen
CREATE INDEX IF NOT EXISTS idx_worker_payment_history_worker_id ON public.worker_payment_history(worker_id);
CREATE INDEX IF NOT EXISTS idx_worker_payment_history_payment_date ON public.worker_payment_history(payment_date);
CREATE INDEX IF NOT EXISTS idx_payment_tasks_payment_id ON public.payment_tasks(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_tasks_task_id ON public.payment_tasks(task_id);

-- Verificar que las tablas se crearon
SELECT 'Verificación final:' as status;
SELECT table_name, 
       (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name AND table_schema = 'public') as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
AND table_name IN ('worker_payment_history', 'payment_tasks', 'payment_updates_log')
ORDER BY table_name;
















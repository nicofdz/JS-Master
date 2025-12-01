-- =====================================================
-- VERIFICAR ESTRUCTURA DE LA TABLA payment_tasks
-- =====================================================

-- Verificar si la tabla payment_tasks existe y su estructura
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'payment_tasks'
ORDER BY ordinal_position;

-- Verificar si la columna task_payment_amount existe
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
              AND table_name = 'payment_tasks' 
              AND column_name = 'task_payment_amount'
        ) THEN 'La columna task_payment_amount EXISTE'
        ELSE 'La columna task_payment_amount NO EXISTE'
    END as status;











-- =====================================================
-- DESHABILITAR TRIGGER TEMPORALMENTE PARA DEBUG
-- =====================================================

-- Deshabilitar el trigger temporalmente
DROP TRIGGER IF EXISTS trigger_update_apartment_status ON apartment_tasks;

-- Verificar que el trigger se eliminó
SELECT trigger_name, event_manipulation, action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'apartment_tasks';

-- Probar crear una tarea manualmente para ver si funciona sin el trigger
-- INSERT INTO apartment_tasks (apartment_id, task_name, task_category, status, priority) 
-- VALUES (1, 'Test Task', 'Estructura', 'pending', 'medium');


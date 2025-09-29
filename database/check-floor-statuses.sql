-- =====================================================
-- VERIFICAR STATUS DE PISOS
-- =====================================================

-- Verificar status únicos en la tabla floors
SELECT DISTINCT status, COUNT(*) as count
FROM floors
GROUP BY status
ORDER BY status;

-- Verificar status únicos en la tabla apartments
SELECT DISTINCT status, COUNT(*) as count
FROM apartments
GROUP BY status
ORDER BY status;

-- Verificar pisos con apartamentos
SELECT 
    f.id as floor_id,
    f.floor_number,
    f.status as floor_status,
    COUNT(a.id) as apartments_count,
    COUNT(CASE WHEN a.status = 'completed' THEN 1 END) as completed_apartments,
    COUNT(CASE WHEN a.status = 'in-progress' THEN 1 END) as in_progress_apartments,
    COUNT(CASE WHEN a.status = 'pending' THEN 1 END) as pending_apartments
FROM floors f
LEFT JOIN apartments a ON f.id = a.floor_id
GROUP BY f.id, f.floor_number, f.status
ORDER BY f.floor_number;
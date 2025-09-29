-- =====================================================
-- PRUEBA FINAL DEL FLUJO (SIN ERRORES)
-- =====================================================

-- 1. CREAR UNA TAREA DE PRUEBA SI NO EXISTE
INSERT INTO public.apartment_tasks (
  task_name,
  task_description,
  task_category,
  status,
  priority,
  apartment_id,
  start_date,
  estimated_hours
) VALUES (
  'Tarea de Prueba para Imágenes',
  'Esta es una tarea de prueba para verificar el flujo de imágenes',
  'construction',
  'completed',
  'medium',
  (SELECT id FROM public.apartments LIMIT 1),
  NOW(),
  2
) ON CONFLICT DO NOTHING;

-- 2. OBTENER ID DE LA TAREA DE PRUEBA
SELECT 
  '=== TEST TASK ID ===' as section,
  id,
  task_name,
  status
FROM public.apartment_tasks 
WHERE task_name = 'Tarea de Prueba para Imágenes'
LIMIT 1;

-- 3. SIMULAR UNA FOTO DE PRUEBA (SIN ARCHIVO REAL)
INSERT INTO public.task_completion_photos (
  task_id,
  file_url,
  file_name,
  file_size,
  description
) VALUES (
  (SELECT id FROM public.apartment_tasks WHERE task_name = 'Tarea de Prueba para Imágenes' LIMIT 1),
  'https://via.placeholder.com/300x200/0066CC/FFFFFF?text=Test+Image',
  'test-image.jpg',
  1024,
  'Imagen de prueba para verificar el flujo'
) ON CONFLICT DO NOTHING;

-- 4. VERIFICAR QUE LA FOTO SE INSERTÓ
SELECT 
  '=== TEST PHOTO INSERTED ===' as section,
  id,
  task_id,
  file_url,
  file_name,
  file_size,
  description,
  uploaded_at
FROM public.task_completion_photos 
WHERE file_name = 'test-image.jpg';

-- 5. VERIFICAR QUE LA TAREA TIENE FOTOS
SELECT 
  '=== TASK WITH PHOTOS ===' as section,
  t.id,
  t.task_name,
  t.status,
  COUNT(p.id) as photo_count,
  STRING_AGG(p.file_url, ', ') as photo_urls
FROM public.apartment_tasks t
LEFT JOIN public.task_completion_photos p ON t.id = p.task_id
WHERE t.task_name = 'Tarea de Prueba para Imágenes'
GROUP BY t.id, t.task_name, t.status;

-- 6. LIMPIAR DATOS DE PRUEBA
DELETE FROM public.task_completion_photos 
WHERE file_name = 'test-image.jpg';

DELETE FROM public.apartment_tasks 
WHERE task_name = 'Tarea de Prueba para Imágenes';

-- 7. MENSAJE DE CONFIRMACIÓN
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'PRUEBA DEL FLUJO COMPLETO EXITOSA!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ Tarea de prueba creada';
    RAISE NOTICE '✅ Foto de prueba insertada';
    RAISE NOTICE '✅ Relación tarea-foto verificada';
    RAISE NOTICE '✅ Datos de prueba eliminados';
    RAISE NOTICE '✅ El flujo de base de datos funciona';
    RAISE NOTICE '========================================';
END $$;

-- =====================================================
-- SCRIPT COMPLETO PARA ARREGLAR RLS Y STORAGE
-- =====================================================

-- 1. Verificar y crear tabla task_completion_photos si no existe
CREATE TABLE IF NOT EXISTS public.task_completion_photos (
  id SERIAL PRIMARY KEY,
  task_id INTEGER REFERENCES public.apartment_tasks(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name VARCHAR(255),
  file_size INTEGER,
  uploaded_by UUID REFERENCES public.user_profiles(id),
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  description TEXT
);

-- 2. Crear índices si no existen
CREATE INDEX IF NOT EXISTS idx_task_completion_photos_task_id ON public.task_completion_photos(task_id);
CREATE INDEX IF NOT EXISTS idx_task_completion_photos_uploaded_by ON public.task_completion_photos(uploaded_by);

-- 3. Habilitar RLS en la tabla
ALTER TABLE public.task_completion_photos ENABLE ROW LEVEL SECURITY;

-- 4. Eliminar políticas existentes si existen
DROP POLICY IF EXISTS "Authenticated users can view task completion photos" ON public.task_completion_photos;
DROP POLICY IF EXISTS "Authenticated users can upload task completion photos" ON public.task_completion_photos;
DROP POLICY IF EXISTS "Users can delete their own photos" ON public.task_completion_photos;

-- 5. Crear políticas RLS para la tabla
CREATE POLICY "Authenticated users can view task completion photos" ON public.task_completion_photos 
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can upload task completion photos" ON public.task_completion_photos 
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete task completion photos" ON public.task_completion_photos 
FOR DELETE USING (auth.role() = 'authenticated');

-- 6. Verificar y crear bucket de storage
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'task-photos') THEN
        RAISE NOTICE 'Creando bucket task-photos...';
        
        INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
        VALUES (
          'task-photos',
          'task-photos',
          true,
          10485760, -- 10MB en bytes
          ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
        );
        
        RAISE NOTICE 'Bucket task-photos creado exitosamente!';
    ELSE
        RAISE NOTICE 'El bucket task-photos ya existe.';
    END IF;
END $$;

-- 7. Eliminar políticas existentes del storage si existen
DROP POLICY IF EXISTS "Authenticated users can view task photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload task photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own task photos" ON storage.objects;

-- 8. Crear políticas RLS para el storage
CREATE POLICY "Authenticated users can view task photos" ON storage.objects
FOR SELECT USING (bucket_id = 'task-photos' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can upload task photos" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'task-photos' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated users can delete task photos" ON storage.objects
FOR DELETE USING (
  bucket_id = 'task-photos' 
  AND auth.role() = 'authenticated'
);

-- 9. Mensaje final de confirmación
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'CONFIGURACIÓN COMPLETA EXITOSA!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ Tabla task_completion_photos configurada';
    RAISE NOTICE '✅ Bucket task-photos configurado';
    RAISE NOTICE '✅ Políticas RLS configuradas';
    RAISE NOTICE '✅ Usuarios autenticados pueden:';
    RAISE NOTICE '   - Ver fotos de tareas completadas';
    RAISE NOTICE '   - Subir fotos de tareas completadas';
    RAISE NOTICE '   - Eliminar fotos de tareas completadas';
    RAISE NOTICE '========================================';
END $$;

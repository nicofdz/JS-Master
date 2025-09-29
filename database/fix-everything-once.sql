-- =====================================================
-- ARREGLAR TODO DE UNA VEZ
-- =====================================================

-- 1. Crear tabla task_completion_photos si no existe
CREATE TABLE IF NOT EXISTS public.task_completion_photos (
  id SERIAL PRIMARY KEY,
  task_id INTEGER REFERENCES public.apartment_tasks(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name VARCHAR(255),
  file_size INTEGER,
  description TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Crear índices
CREATE INDEX IF NOT EXISTS idx_task_completion_photos_task_id ON public.task_completion_photos(task_id);
CREATE INDEX IF NOT EXISTS idx_task_completion_photos_uploaded_by ON public.task_completion_photos(uploaded_by);

-- 3. Habilitar RLS
ALTER TABLE public.task_completion_photos ENABLE ROW LEVEL SECURITY;

-- 4. Eliminar políticas existentes
DROP POLICY IF EXISTS "task_completion_photos_select_policy" ON public.task_completion_photos;
DROP POLICY IF EXISTS "task_completion_photos_insert_policy" ON public.task_completion_photos;
DROP POLICY IF EXISTS "task_completion_photos_delete_policy" ON public.task_completion_photos;

-- 5. Crear políticas RLS simples
CREATE POLICY "task_completion_photos_select_policy" ON public.task_completion_photos 
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "task_completion_photos_insert_policy" ON public.task_completion_photos 
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "task_completion_photos_delete_policy" ON public.task_completion_photos 
FOR DELETE USING (auth.role() = 'authenticated');

-- 6. Crear bucket si no existe
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'task-photos',
  'task-photos',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

-- 7. Eliminar políticas del storage
DROP POLICY IF EXISTS "task_photos_select_policy" ON storage.objects;
DROP POLICY IF EXISTS "task_photos_insert_policy" ON storage.objects;
DROP POLICY IF EXISTS "task_photos_delete_policy" ON storage.objects;

-- 8. Crear políticas del storage
CREATE POLICY "task_photos_select_policy" ON storage.objects
FOR SELECT USING (bucket_id = 'task-photos' AND auth.role() = 'authenticated');

CREATE POLICY "task_photos_insert_policy" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'task-photos' AND auth.role() = 'authenticated');

CREATE POLICY "task_photos_delete_policy" ON storage.objects
FOR DELETE USING (bucket_id = 'task-photos' AND auth.role() = 'authenticated');

-- 9. Verificar que todo está bien
SELECT 'EVERYTHING FIXED' as status;

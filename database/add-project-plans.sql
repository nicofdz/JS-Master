-- =====================================================
-- AGREGAR SISTEMA DE PLANOS A PROYECTOS
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- 1. Agregar campo plan_pdf a la tabla projects
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS plan_pdf TEXT,
ADD COLUMN IF NOT EXISTS plan_image_url TEXT,
ADD COLUMN IF NOT EXISTS plan_uploaded_at TIMESTAMP WITH TIME ZONE;

-- 2. Crear bucket para planos PDF
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'project-plans',
  'project-plans',
  true,
  52428800, -- 50MB
  ARRAY['application/pdf']
) ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['application/pdf'];

-- 3. Crear políticas RLS para el bucket de planos
CREATE POLICY "Authenticated users can view project plans" ON storage.objects
FOR SELECT USING (bucket_id = 'project-plans' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can upload project plans" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'project-plans' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update project plans" ON storage.objects
FOR UPDATE USING (bucket_id = 'project-plans' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete project plans" ON storage.objects
FOR DELETE USING (bucket_id = 'project-plans' AND auth.role() = 'authenticated');

-- 4. Crear bucket para imágenes de planos (conversión de PDF)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'project-plan-images',
  'project-plan-images',
  true,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- 5. Crear políticas RLS para el bucket de imágenes de planos
CREATE POLICY "Authenticated users can view project plan images" ON storage.objects
FOR SELECT USING (bucket_id = 'project-plan-images' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can upload project plan images" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'project-plan-images' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update project plan images" ON storage.objects
FOR UPDATE USING (bucket_id = 'project-plan-images' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete project plan images" ON storage.objects
FOR DELETE USING (bucket_id = 'project-plan-images' AND auth.role() = 'authenticated');

-- 6. Agregar comentarios a los nuevos campos
COMMENT ON COLUMN public.projects.plan_pdf IS 'URL del archivo PDF del plano del proyecto';
COMMENT ON COLUMN public.projects.plan_image_url IS 'URL de la imagen generada del plano (primera página del PDF)';
COMMENT ON COLUMN public.projects.plan_uploaded_at IS 'Fecha y hora de subida del plano';

-- 7. Verificar que los campos fueron agregados
SELECT 'Verificación de campos agregados:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'projects' 
AND table_schema = 'public'
AND column_name IN ('plan_pdf', 'plan_image_url', 'plan_uploaded_at')
ORDER BY column_name;

-- 8. Verificar que los buckets fueron creados
SELECT 'Buckets creados:' as info;
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE id IN ('project-plans', 'project-plan-images');









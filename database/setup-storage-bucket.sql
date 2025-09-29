-- =====================================================
-- CONFIGURACIÓN DE STORAGE BUCKET PARA FOTOS DE TAREAS
-- =====================================================

-- Crear bucket para fotos de tareas (si no existe)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'task-photos',
  'task-photos',
  true,
  10485760, -- 10MB en bytes
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Políticas RLS para el bucket
CREATE POLICY "Authenticated users can view task photos" ON storage.objects
FOR SELECT USING (bucket_id = 'task-photos' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can upload task photos" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'task-photos' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = 'task-completion-photos'
);

CREATE POLICY "Users can delete their own task photos" ON storage.objects
FOR DELETE USING (
  bucket_id = 'task-photos' 
  AND auth.role() = 'authenticated'
);

-- Mensaje de confirmación
DO $$
BEGIN
    RAISE NOTICE 'Bucket task-photos configurado exitosamente!';
    RAISE NOTICE 'Políticas RLS configuradas para el storage';
    RAISE NOTICE 'Límite de archivo: 10MB';
    RAISE NOTICE 'Tipos permitidos: JPEG, JPG, PNG, WEBP';
END $$;

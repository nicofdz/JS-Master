-- =====================================================
-- ARREGLAR POLÍTICAS RLS PARA STORAGE BUCKET
-- =====================================================

-- Verificar si el bucket existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'task-photos') THEN
        RAISE NOTICE 'El bucket task-photos no existe. Creándolo...';
        
        -- Crear bucket para fotos de tareas
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

-- Eliminar políticas existentes del storage si existen
DROP POLICY IF EXISTS "Authenticated users can view task photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload task photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own task photos" ON storage.objects;

-- Crear políticas RLS para el bucket de storage
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

-- Mensaje de confirmación
DO $$
BEGIN
    RAISE NOTICE 'Políticas RLS para storage.objects configuradas correctamente!';
    RAISE NOTICE 'Los usuarios autenticados pueden:';
    RAISE NOTICE '- Ver fotos en el bucket task-photos';
    RAISE NOTICE '- Subir fotos al bucket task-photos';
    RAISE NOTICE '- Eliminar fotos del bucket task-photos';
END $$;

-- ============================================
-- CONFIGURAR POLÍTICAS PARA BUCKET DE FACTURAS
-- ============================================
-- 
-- IMPORTANTE: Este script asume que ya tienes el bucket "invoices" creado
-- Si no lo tienes, créalo primero desde el dashboard de Supabase
--
-- ============================================

-- Eliminar políticas existentes si existen (para evitar conflictos)
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload invoices" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own invoices" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own invoices" ON storage.objects;

-- Política 1: Lectura pública de facturas
CREATE POLICY "Public Access" ON storage.objects
FOR SELECT USING (bucket_id = 'invoices');

-- Política 2: Subida de facturas por usuarios autenticados
CREATE POLICY "Authenticated users can upload invoices" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'invoices' 
  AND auth.role() = 'authenticated'
);

-- Política 3: Actualización de facturas por el propietario
CREATE POLICY "Users can update own invoices" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'invoices' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Política 4: Eliminación de facturas por el propietario
CREATE POLICY "Users can delete own invoices" ON storage.objects
FOR DELETE USING (
  bucket_id = 'invoices' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Verificar que las políticas se crearon correctamente
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'objects' 
  AND policyname IN (
    'Public Access',
    'Authenticated users can upload invoices',
    'Users can update own invoices',
    'Users can delete own invoices'
  );

-- Mensaje de confirmación
SELECT 'Políticas de storage configuradas correctamente' as status;












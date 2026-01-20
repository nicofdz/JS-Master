-- ALERTA: Ejecuta este script en el SQL Editor de Supabase para corregir el error de permisos (400/403)
-- Esto permite a los usuarios autenticados subir y actualizar archivos en la carpeta 'templates' del bucket 'contracts'.

-- 1. Permitir INSERT (Subir nuevos archivos)
CREATE POLICY "Permitir subir plantillas a autenticados"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'contracts' 
  AND (storage.foldername(name))[1] = 'templates'
);

-- 2. Permitir UPDATE (Actualizar archivos existentes)
CREATE POLICY "Permitir actualizar plantillas a autenticados"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'contracts' 
  AND (storage.foldername(name))[1] = 'templates'
);

-- 3. Permitir SELECT (Descargar - probablemente ya existe, pero por seguridad)
CREATE POLICY "Permitir descargar plantillas a autenticados"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'contracts' 
  AND (storage.foldername(name))[1] = 'templates'
);

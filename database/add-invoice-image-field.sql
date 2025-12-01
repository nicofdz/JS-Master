-- =====================================================
-- AGREGAR CAMPO PARA IMAGEN DE VISTA PREVIA DE FACTURA
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- 1. Agregar campo image_url a la tabla invoice_income
ALTER TABLE invoice_income 
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- 2. Comentario para el nuevo campo
COMMENT ON COLUMN invoice_income.image_url IS 'URL de la imagen de vista previa generada desde el PDF';

-- 3. Verificar que el campo se agregó correctamente
SELECT 'Campo image_url agregado exitosamente' as status;

-- 4. Mostrar estructura actualizada de la tabla
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'invoice_income' 
AND table_schema = 'public'
AND column_name IN ('pdf_url', 'image_url')
ORDER BY ordinal_position;







<<<<<<< HEAD
=======

>>>>>>> 5b12c23a03c59a530b62e17c08f8d6ba5d623620

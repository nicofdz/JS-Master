-- =====================================================
-- AUMENTAR LÍMITE DE CARACTERES EN apartment_number
-- =====================================================
-- El campo apartment_number está limitado a VARCHAR(20)
-- pero puede necesitar más espacio para nombres más largos
-- =====================================================

-- Aumentar el límite de apartment_number de VARCHAR(20) a VARCHAR(100)
ALTER TABLE public.apartments 
ALTER COLUMN apartment_number TYPE VARCHAR(100);

-- Verificar el cambio
SELECT 
    column_name, 
    data_type, 
    character_maximum_length
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'apartments' 
AND column_name = 'apartment_number';

-- Debería mostrar: character_maximum_length = 100


-- Script para corregir el tamaño de las columnas RUT
-- Los RUTs chilenos pueden ser más largos que 20 caracteres

-- Aumentar el tamaño de issuer_rut
ALTER TABLE invoice_income 
ALTER COLUMN issuer_rut TYPE VARCHAR(50);

-- Aumentar el tamaño de client_rut  
ALTER TABLE invoice_income 
ALTER COLUMN client_rut TYPE VARCHAR(50);

-- Verificar los cambios
SELECT 
  column_name, 
  data_type, 
  character_maximum_length 
FROM information_schema.columns 
WHERE table_name = 'invoice_income' 
  AND column_name IN ('issuer_rut', 'client_rut');

-- Mostrar algunos ejemplos de RUTs para verificar
SELECT 
  id,
  issuer_rut,
  client_rut,
  LENGTH(issuer_rut) as issuer_rut_length,
  LENGTH(client_rut) as client_rut_length
FROM invoice_income 
ORDER BY created_at DESC 
LIMIT 5;










<<<<<<< HEAD
=======

>>>>>>> 5b12c23a03c59a530b62e17c08f8d6ba5d623620

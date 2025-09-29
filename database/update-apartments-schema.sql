-- Actualizar esquema de apartamentos para usar apartment_name en lugar de apartment_number

-- 1. Agregar la columna apartment_name si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'apartments' 
        AND column_name = 'apartment_name'
    ) THEN
        ALTER TABLE apartments ADD COLUMN apartment_name VARCHAR(50);
    END IF;
END $$;

-- 2. Copiar datos de apartment_number a apartment_name si apartment_name está vacío
UPDATE apartments 
SET apartment_name = apartment_number 
WHERE apartment_name IS NULL OR apartment_name = '';

-- 3. Hacer apartment_name NOT NULL después de copiar los datos
ALTER TABLE apartments ALTER COLUMN apartment_name SET NOT NULL;

-- 4. Crear índice en apartment_name para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_apartments_apartment_name ON apartments(apartment_name);

-- 5. Verificar que los datos se copiaron correctamente
SELECT 
    id, 
    apartment_number, 
    apartment_name, 
    floor_id,
    status
FROM apartments 
LIMIT 10;


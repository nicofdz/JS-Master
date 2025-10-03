-- Agregar campo de tarifa diaria a la tabla de trabajadores
ALTER TABLE public.workers 
ADD COLUMN IF NOT EXISTS daily_rate DECIMAL(10, 2) DEFAULT 0;

COMMENT ON COLUMN public.workers.daily_rate IS 'Tarifa diaria del trabajador (solo para contrato por día)';

-- Actualizar trabajadores existentes que tengan contrato "por_dia" con un valor por defecto
UPDATE public.workers 
SET daily_rate = 0 
WHERE contract_type = 'por_dia' AND daily_rate IS NULL;



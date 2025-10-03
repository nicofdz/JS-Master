-- Agregar campo contract_type a la tabla workers (trabajadores)
-- Tipo de contrato: 'a_trato' o 'por_dia'

ALTER TABLE public.workers 
ADD COLUMN IF NOT EXISTS contract_type VARCHAR(20) DEFAULT 'por_dia';

-- Agregar comentario para documentación
COMMENT ON COLUMN public.workers.contract_type IS 'Tipo de contrato del trabajador: a_trato o por_dia';

-- Actualizar trabajadores existentes que no tengan tipo de contrato
UPDATE public.workers 
SET contract_type = 'por_dia' 
WHERE contract_type IS NULL;


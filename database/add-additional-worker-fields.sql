-- =====================================================
-- AGREGAR CAMPOS ADICIONALES A LA TABLA WORKERS
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- Agregar campos adicionales para información personal del trabajador
ALTER TABLE public.workers 
ADD COLUMN IF NOT EXISTS nacionalidad VARCHAR(100) DEFAULT 'Chilena',
ADD COLUMN IF NOT EXISTS ciudad VARCHAR(100),
ADD COLUMN IF NOT EXISTS direccion TEXT,
ADD COLUMN IF NOT EXISTS estado_civil VARCHAR(50),
ADD COLUMN IF NOT EXISTS fecha_nacimiento DATE,
ADD COLUMN IF NOT EXISTS prevision VARCHAR(100),
ADD COLUMN IF NOT EXISTS salud VARCHAR(100),
ADD COLUMN IF NOT EXISTS cargo VARCHAR(100);

-- Agregar comentarios para documentar los nuevos campos
COMMENT ON COLUMN public.workers.nacionalidad IS 'Nacionalidad del trabajador';
COMMENT ON COLUMN public.workers.ciudad IS 'Ciudad de residencia del trabajador';
COMMENT ON COLUMN public.workers.direccion IS 'Dirección completa del trabajador';
COMMENT ON COLUMN public.workers.estado_civil IS 'Estado civil del trabajador';
COMMENT ON COLUMN public.workers.fecha_nacimiento IS 'Fecha de nacimiento del trabajador';
COMMENT ON COLUMN public.workers.prevision IS 'Sistema de previsión (AFP) del trabajador';
COMMENT ON COLUMN public.workers.salud IS 'Sistema de salud del trabajador';
COMMENT ON COLUMN public.workers.cargo IS 'Cargo o posición del trabajador';

-- Crear índices para optimizar consultas por campos comunes
CREATE INDEX IF NOT EXISTS idx_workers_ciudad ON public.workers(ciudad);
CREATE INDEX IF NOT EXISTS idx_workers_cargo ON public.workers(cargo);
CREATE INDEX IF NOT EXISTS idx_workers_prevision ON public.workers(prevision);

-- Actualizar la función de trigger para incluir los nuevos campos
CREATE OR REPLACE FUNCTION update_workers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Verificar que el trigger existe y funciona correctamente
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_workers_updated_at'
    ) THEN
        CREATE TRIGGER update_workers_updated_at 
          BEFORE UPDATE ON public.workers 
          FOR EACH ROW 
          EXECUTE FUNCTION update_workers_updated_at();
    END IF;
END $$;


-- =====================================================
-- CREAR TABLA DE TRABAJADORES
-- Ejecutar en Supabase SQL Editor
-- =====================================================

CREATE TABLE IF NOT EXISTS public.workers (
  id SERIAL PRIMARY KEY,
  full_name VARCHAR(255) NOT NULL,
  rut VARCHAR(12) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE,
  phone VARCHAR(20),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para optimización
CREATE INDEX IF NOT EXISTS idx_workers_active ON public.workers(is_active);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_workers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Eliminar trigger si existe y crear uno nuevo
DROP TRIGGER IF EXISTS update_workers_updated_at ON public.workers;
CREATE TRIGGER update_workers_updated_at 
  BEFORE UPDATE ON public.workers 
  FOR EACH ROW 
  EXECUTE FUNCTION update_workers_updated_at();

-- RLS
ALTER TABLE public.workers ENABLE ROW LEVEL SECURITY;

-- Políticas RLS (eliminar si existen y crear nuevas)
DROP POLICY IF EXISTS "Authenticated users can view workers" ON public.workers;
DROP POLICY IF EXISTS "Authenticated users can insert workers" ON public.workers;
DROP POLICY IF EXISTS "Authenticated users can update workers" ON public.workers;
DROP POLICY IF EXISTS "Authenticated users can delete workers" ON public.workers;

CREATE POLICY "Authenticated users can view workers" ON public.workers
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert workers" ON public.workers
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update workers" ON public.workers
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete workers" ON public.workers
  FOR DELETE USING (auth.role() = 'authenticated');

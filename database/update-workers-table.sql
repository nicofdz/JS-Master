-- =====================================================
-- ACTUALIZAR TABLA DE TRABAJADORES
-- Solo ejecutar si ya existe la tabla
-- =====================================================

-- Verificar si la tabla existe y agregar columna RUT si no existe
DO $$
BEGIN
    -- Agregar columna RUT si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'workers' 
        AND column_name = 'rut'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.workers ADD COLUMN rut VARCHAR(12) UNIQUE NOT NULL DEFAULT '';
    END IF;
END $$;

-- Crear índice si no existe
CREATE INDEX IF NOT EXISTS idx_workers_active ON public.workers(is_active);

-- Función para trigger (solo si no existe)
CREATE OR REPLACE FUNCTION update_workers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger (solo si no existe)
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

-- RLS (solo si no está habilitado)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_class 
        WHERE relname = 'workers' 
        AND relrowsecurity = true
    ) THEN
        ALTER TABLE public.workers ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Políticas RLS (solo si no existen)
DO $$
BEGIN
    -- Política de SELECT
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'workers' 
        AND policyname = 'Authenticated users can view workers'
    ) THEN
        CREATE POLICY "Authenticated users can view workers" ON public.workers
          FOR SELECT USING (auth.role() = 'authenticated');
    END IF;
    
    -- Política de INSERT
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'workers' 
        AND policyname = 'Authenticated users can insert workers'
    ) THEN
        CREATE POLICY "Authenticated users can insert workers" ON public.workers
          FOR INSERT WITH CHECK (auth.role() = 'authenticated');
    END IF;
    
    -- Política de UPDATE
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'workers' 
        AND policyname = 'Authenticated users can update workers'
    ) THEN
        CREATE POLICY "Authenticated users can update workers" ON public.workers
          FOR UPDATE USING (auth.role() = 'authenticated');
    END IF;
    
    -- Política de DELETE
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'workers' 
        AND policyname = 'Authenticated users can delete workers'
    ) THEN
        CREATE POLICY "Authenticated users can delete workers" ON public.workers
          FOR DELETE USING (auth.role() = 'authenticated');
    END IF;
END $$;

-- =====================================================
-- CREAR TABLAS PARA SISTEMA DE HERRAMIENTAS
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- 1. Crear tabla tools (herramientas)
CREATE TABLE IF NOT EXISTS public.tools (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  brand VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'disponible' CHECK (status IN ('disponible', 'prestada', 'mantenimiento', 'perdida')),
  value DECIMAL(10,2) NOT NULL,
  location VARCHAR(255) DEFAULT 'Almacén Principal',
  details TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Crear tabla tool_loans (historial de préstamos)
CREATE TABLE IF NOT EXISTS public.tool_loans (
  id SERIAL PRIMARY KEY,
  tool_id INTEGER REFERENCES public.tools(id) ON DELETE CASCADE,
  borrower_id INTEGER NOT NULL,
  borrower_name VARCHAR(255) NOT NULL,
  loan_date DATE NOT NULL,
  return_date DATE,
  return_details TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Crear índices para mejorar performance
CREATE INDEX IF NOT EXISTS idx_tools_status ON public.tools(status);
CREATE INDEX IF NOT EXISTS idx_tools_brand ON public.tools(brand);
CREATE INDEX IF NOT EXISTS idx_tool_loans_tool_id ON public.tool_loans(tool_id);
CREATE INDEX IF NOT EXISTS idx_tool_loans_borrower_id ON public.tool_loans(borrower_id);
CREATE INDEX IF NOT EXISTS idx_tool_loans_loan_date ON public.tool_loans(loan_date);

-- 4. Crear función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 5. Crear trigger para actualizar updated_at en tools
DROP TRIGGER IF EXISTS update_tools_updated_at ON public.tools;
CREATE TRIGGER update_tools_updated_at
    BEFORE UPDATE ON public.tools
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 6. Función para prestar herramienta
CREATE OR REPLACE FUNCTION public.loan_tool(
  p_tool_id INTEGER,
  p_borrower_id INTEGER,
  p_borrower_name VARCHAR(255)
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_loan_id INTEGER;
BEGIN
  -- Verificar que la herramienta esté disponible
  IF NOT EXISTS (
    SELECT 1 FROM public.tools 
    WHERE id = p_tool_id AND status = 'disponible'
  ) THEN
    RAISE EXCEPTION 'La herramienta no está disponible para préstamo';
  END IF;

  -- Crear el préstamo
  INSERT INTO public.tool_loans (tool_id, borrower_id, borrower_name, loan_date)
  VALUES (p_tool_id, p_borrower_id, p_borrower_name, CURRENT_DATE)
  RETURNING id INTO v_loan_id;

  -- Actualizar el estado de la herramienta
  UPDATE public.tools 
  SET 
    status = 'prestada',
    location = 'Prestada a ' || p_borrower_name,
    updated_at = NOW()
  WHERE id = p_tool_id;

  RETURN v_loan_id;
END;
$$;

-- 7. Función para devolver herramienta
CREATE OR REPLACE FUNCTION public.return_tool(
  p_loan_id INTEGER,
  p_return_details TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_tool_id INTEGER;
BEGIN
  -- Obtener el tool_id del préstamo
  SELECT tool_id INTO v_tool_id
  FROM public.tool_loans
  WHERE id = p_loan_id AND return_date IS NULL;

  IF v_tool_id IS NULL THEN
    RAISE EXCEPTION 'Préstamo no encontrado o ya devuelto';
  END IF;

  -- Actualizar el préstamo
  UPDATE public.tool_loans 
  SET 
    return_date = CURRENT_DATE,
    return_details = p_return_details
  WHERE id = p_loan_id;

  -- Actualizar el estado de la herramienta
  UPDATE public.tools 
  SET 
    status = 'disponible',
    location = 'Almacén Principal',
    updated_at = NOW()
  WHERE id = v_tool_id;
END;
$$;

-- 8. Función para obtener herramientas disponibles
CREATE OR REPLACE FUNCTION public.get_available_tools()
RETURNS TABLE (
  id INTEGER,
  name VARCHAR(255),
  brand VARCHAR(255),
  value DECIMAL(10,2),
  location VARCHAR(255),
  details TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT t.id, t.name, t.brand, t.value, t.location, t.details
  FROM public.tools t
  WHERE t.status = 'disponible'
  ORDER BY t.name;
END;
$$;

-- 9. Función para obtener historial de préstamos de una herramienta
CREATE OR REPLACE FUNCTION public.get_tool_loan_history(p_tool_id INTEGER)
RETURNS TABLE (
  loan_id INTEGER,
  borrower_name VARCHAR(255),
  loan_date DATE,
  return_date DATE,
  return_details TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT tl.id, tl.borrower_name, tl.loan_date, tl.return_date, tl.return_details
  FROM public.tool_loans tl
  WHERE tl.tool_id = p_tool_id
  ORDER BY tl.loan_date DESC;
END;
$$;

-- 10. Comentarios para documentar las tablas
COMMENT ON TABLE public.tools IS 'Inventario de herramientas de la empresa';
COMMENT ON TABLE public.tool_loans IS 'Historial de préstamos de herramientas';

COMMENT ON COLUMN public.tools.name IS 'Nombre de la herramienta';
COMMENT ON COLUMN public.tools.brand IS 'Marca de la herramienta';
COMMENT ON COLUMN public.tools.status IS 'Estado actual: disponible, prestada, mantenimiento, perdida';
COMMENT ON COLUMN public.tools.value IS 'Valor monetario de la herramienta';
COMMENT ON COLUMN public.tools.location IS 'Ubicación actual de la herramienta';
COMMENT ON COLUMN public.tools.details IS 'Detalles específicos de la herramienta';

COMMENT ON COLUMN public.tool_loans.tool_id IS 'ID de la herramienta prestada';
COMMENT ON COLUMN public.tool_loans.borrower_id IS 'ID de la persona que recibe el préstamo';
COMMENT ON COLUMN public.tool_loans.borrower_name IS 'Nombre de la persona que recibe el préstamo';
COMMENT ON COLUMN public.tool_loans.loan_date IS 'Fecha en que se prestó la herramienta';
COMMENT ON COLUMN public.tool_loans.return_date IS 'Fecha en que se devolvió la herramienta (NULL si no se ha devuelto)';
COMMENT ON COLUMN public.tool_loans.return_details IS 'Detalles del estado al devolver la herramienta';

-- 11. Insertar datos de ejemplo
INSERT INTO public.tools (name, brand, status, value, location, details) VALUES
('Taladro Percutor', 'Bosch', 'disponible', 150000, 'Almacén Principal', 'Taladro percutor de 800W con maletín y accesorios completos'),
('Sierra Circular', 'DeWalt', 'prestada', 200000, 'Prestada a Juan Pérez', 'Sierra circular de 7 1/4 pulgadas con hoja de corte para madera'),
('Nivel Láser', 'Leica', 'disponible', 300000, 'Almacén Principal', 'Nivel láser rotativo de 360° con alcance de 100m')
ON CONFLICT DO NOTHING;

-- 12. Insertar préstamos de ejemplo
INSERT INTO public.tool_loans (tool_id, borrower_id, borrower_name, loan_date, return_date, return_details) VALUES
(2, 1, 'Juan Pérez', '2024-01-15', NULL, NULL),
(1, 2, 'María González', '2024-01-10', '2024-01-12', 'Devuelto en buen estado')
ON CONFLICT DO NOTHING;

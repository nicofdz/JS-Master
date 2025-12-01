-- =====================================================
-- CREAR TABLA PARA CATEGORÍAS DE TAREAS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.task_categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION public.set_task_categories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_task_categories_updated_at ON public.task_categories;
CREATE TRIGGER trg_set_task_categories_updated_at
BEFORE UPDATE ON public.task_categories
FOR EACH ROW EXECUTE FUNCTION public.set_task_categories_updated_at();

-- Semillas iniciales
INSERT INTO public.task_categories (name, description)
VALUES
  ('Estructura', 'Trabajos estructurales y de soporte'),
  ('Acabados', 'Terminaciones y acabados interiores/exteriores'),
  ('Instalaciones', 'Instalaciones eléctricas, sanitarias u otras')
ON CONFLICT (name) DO NOTHING;

COMMENT ON TABLE public.task_categories IS 'Catálogo centralizado de categorías de tareas';
COMMENT ON COLUMN public.task_categories.name IS 'Nombre visible de la categoría';


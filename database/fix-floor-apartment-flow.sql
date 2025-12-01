-- =====================================================
-- CORRECCIONES PARA FLUJO PISOS → DEPARTAMENTOS → TAREAS
-- Ejecutar en Supabase SQL Editor
-- =====================================================
-- 
-- ⚠️ OBSOLETO: La columna total_apartments fue eliminada en la migración
-- remove_total_apartments_from_floors.sql ya que ahora se calcula dinámicamente
-- 
-- =====================================================

-- =====================================================
-- 1. MEJORAR TABLA DE PISOS
-- =====================================================

-- ⚠️ OBSOLETO - Esta columna fue eliminada
-- Ahora el conteo de apartamentos se calcula dinámicamente
-- ALTER TABLE public.floors 
-- ADD COLUMN IF NOT EXISTS total_apartments INTEGER DEFAULT 0;

-- Agregar campo para descripción del piso
ALTER TABLE public.floors 
ADD COLUMN IF NOT EXISTS description TEXT;

-- =====================================================
-- 2. MEJORAR TABLA DE APARTAMENTOS
-- =====================================================

-- Agregar campo para número de habitaciones
ALTER TABLE public.apartments 
ADD COLUMN IF NOT EXISTS bedrooms INTEGER DEFAULT 0;

-- Agregar campo para número de baños
ALTER TABLE public.apartments 
ADD COLUMN IF NOT EXISTS bathrooms INTEGER DEFAULT 0;

-- Agregar campo para tipo de acabado
ALTER TABLE public.apartments 
ADD COLUMN IF NOT EXISTS finish_type VARCHAR(100); -- Básico, Intermedio, Premium

-- =====================================================
-- 3. CREAR TABLA DE TAREAS POR DEPARTAMENTO
-- =====================================================

CREATE TABLE IF NOT EXISTS public.apartment_tasks (
  id SERIAL PRIMARY KEY,
  apartment_id INTEGER REFERENCES public.apartments(id) ON DELETE CASCADE,
  task_name VARCHAR(255) NOT NULL,
  task_description TEXT,
  task_category VARCHAR(100) NOT NULL, -- Estructura, Instalaciones, Acabados, etc.
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'in-progress', 'completed', 'blocked')),
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  estimated_hours INTEGER DEFAULT 8,
  actual_hours INTEGER DEFAULT 0,
  start_date DATE,
  end_date DATE,
  assigned_to UUID REFERENCES public.user_profiles(id),
  team_id INTEGER REFERENCES public.teams(id),
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 4. CREAR TABLA DE MATERIALES POR TAREA
-- =====================================================

CREATE TABLE IF NOT EXISTS public.task_materials (
  id SERIAL PRIMARY KEY,
  apartment_task_id INTEGER REFERENCES public.apartment_tasks(id) ON DELETE CASCADE,
  material_id INTEGER REFERENCES public.materials(id),
  quantity DECIMAL(10,2) NOT NULL,
  unit_cost DECIMAL(10,2) NOT NULL,
  total_cost DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 5. CREAR VISTA DE PROGRESO POR PISO
-- =====================================================

CREATE OR REPLACE VIEW public.floor_apartment_progress AS
SELECT 
  f.id as floor_id,
  f.project_id,
  f.floor_number,
  f.status as floor_status,
  f.total_apartments,
  p.name as project_name,
  COUNT(DISTINCT a.id) as apartments_created,
  COUNT(DISTINCT CASE WHEN a.status = 'completed' THEN a.id END) as apartments_completed,
  COUNT(DISTINCT at.id) as total_tasks,
  COUNT(DISTINCT CASE WHEN at.status = 'completed' THEN at.id END) as tasks_completed,
  CASE 
    WHEN COUNT(DISTINCT at.id) > 0 
    THEN ROUND((COUNT(DISTINCT CASE WHEN at.status = 'completed' THEN at.id END) * 100.0) / COUNT(DISTINCT at.id), 2)
    ELSE 0 
  END as progress_percentage
FROM public.floors f
LEFT JOIN public.projects p ON f.project_id = p.id
LEFT JOIN public.apartments a ON f.id = a.floor_id
LEFT JOIN public.apartment_tasks at ON a.id = at.apartment_id
GROUP BY f.id, f.project_id, f.floor_number, f.status, f.total_apartments, p.name;

-- =====================================================
-- 6. CREAR VISTA DE PROGRESO POR DEPARTAMENTO
-- =====================================================

CREATE OR REPLACE VIEW public.apartment_task_progress AS
SELECT 
  a.id as apartment_id,
  a.floor_id,
  a.apartment_number,
  a.apartment_type,
  a.status as apartment_status,
  f.floor_number,
  p.name as project_name,
  COUNT(DISTINCT at.id) as total_tasks,
  COUNT(DISTINCT CASE WHEN at.status = 'completed' THEN at.id END) as tasks_completed,
  CASE 
    WHEN COUNT(DISTINCT at.id) > 0 
    THEN ROUND((COUNT(DISTINCT CASE WHEN at.status = 'completed' THEN at.id END) * 100.0) / COUNT(DISTINCT at.id), 2)
    ELSE 0 
  END as progress_percentage
FROM public.apartments a
LEFT JOIN public.floors f ON a.floor_id = f.id
LEFT JOIN public.projects p ON f.project_id = p.id
LEFT JOIN public.apartment_tasks at ON a.id = at.apartment_id
GROUP BY a.id, a.floor_id, a.apartment_number, a.apartment_type, a.status, f.floor_number, p.name;

-- =====================================================
-- 7. CREAR FUNCIÓN PARA CREAR DEPARTAMENTOS AUTOMÁTICAMENTE
-- =====================================================

CREATE OR REPLACE FUNCTION create_apartments_for_floor(
  floor_id_param INTEGER,
  total_apartments_param INTEGER
)
RETURNS VOID AS $$
DECLARE
  i INTEGER;
BEGIN
  -- Crear departamentos numerados del 1 al total_apartments
  FOR i IN 1..total_apartments_param LOOP
    INSERT INTO public.apartments (floor_id, apartment_number, status)
    VALUES (floor_id_param, i::VARCHAR, 'pending');
  END LOOP;
  
  -- Actualizar el contador en la tabla floors
  UPDATE public.floors 
  SET total_apartments = total_apartments_param
  WHERE id = floor_id_param;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 8. CREAR FUNCIÓN PARA CREAR TAREAS POR DEPARTAMENTO
-- =====================================================

CREATE OR REPLACE FUNCTION create_tasks_for_apartment(
  apartment_id_param INTEGER,
  task_templates JSONB
)
RETURNS VOID AS $$
DECLARE
  task_template JSONB;
BEGIN
  -- Iterar sobre las plantillas de tareas
  FOR task_template IN SELECT * FROM jsonb_array_elements(task_templates)
  LOOP
    INSERT INTO public.apartment_tasks (
      apartment_id,
      task_name,
      task_description,
      task_category,
      priority,
      estimated_hours
    ) VALUES (
      apartment_id_param,
      task_template->>'name',
      task_template->>'description',
      task_template->>'category',
      COALESCE(task_template->>'priority', 'medium'),
      COALESCE((task_template->>'estimated_hours')::INTEGER, 8)
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 9. AGREGAR ÍNDICES PARA OPTIMIZACIÓN
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_apartment_tasks_apartment_id ON public.apartment_tasks(apartment_id);
CREATE INDEX IF NOT EXISTS idx_apartment_tasks_status ON public.apartment_tasks(status);
CREATE INDEX IF NOT EXISTS idx_apartment_tasks_assigned_to ON public.apartment_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_task_materials_task_id ON public.task_materials(apartment_task_id);
CREATE INDEX IF NOT EXISTS idx_floors_total_apartments ON public.floors(total_apartments);

-- =====================================================
-- 10. AGREGAR RLS A NUEVAS TABLAS
-- =====================================================

ALTER TABLE public.apartment_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_materials ENABLE ROW LEVEL SECURITY;

-- Políticas para apartment_tasks
CREATE POLICY "Authenticated users can view apartment tasks" ON public.apartment_tasks FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Assigned users can update their tasks" ON public.apartment_tasks FOR UPDATE USING (auth.uid() = assigned_to);
CREATE POLICY "Supervisors can manage all tasks" ON public.apartment_tasks FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('admin', 'supervisor'))
);

-- Políticas para task_materials
CREATE POLICY "Authenticated users can view task materials" ON public.task_materials FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Supervisors can manage task materials" ON public.task_materials FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('admin', 'supervisor'))
);

-- =====================================================
-- 11. AGREGAR TRIGGERS DE ACTUALIZACIÓN
-- =====================================================

CREATE TRIGGER update_apartment_tasks_updated_at BEFORE UPDATE ON public.apartment_tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_task_materials_updated_at BEFORE UPDATE ON public.task_materials FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 12. COMENTARIOS EN NUEVAS TABLAS
-- =====================================================

COMMENT ON TABLE public.apartment_tasks IS 'Tareas específicas por departamento';
COMMENT ON TABLE public.task_materials IS 'Materiales utilizados en cada tarea';
COMMENT ON FUNCTION create_apartments_for_floor IS 'Función para crear departamentos automáticamente por piso';
COMMENT ON FUNCTION create_tasks_for_apartment IS 'Función para crear tareas por departamento usando plantillas';

-- =====================================================
-- 13. MENSAJE DE CONFIRMACIÓN
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE 'Correcciones del flujo pisos-departamentos-tareas aplicadas exitosamente!';
    RAISE NOTICE 'Nuevas tablas: apartment_tasks, task_materials';
    RAISE NOTICE 'Campos adicionales agregados a floors y apartments';
    RAISE NOTICE 'Vistas de progreso creadas';
    RAISE NOTICE 'Funciones de automatización implementadas';
END $$;


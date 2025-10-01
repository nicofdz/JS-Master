-- =====================================================
-- CREAR TABLA DE PLANTILLAS DE TAREAS
-- =====================================================

-- Crear tabla task_templates para almacenar las plantillas de tareas
CREATE TABLE IF NOT EXISTS public.task_templates (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  estimated_hours INTEGER NOT NULL DEFAULT 8,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insertar las plantillas de tareas
INSERT INTO public.task_templates (name, category, estimated_hours, sort_order, is_active) VALUES
('Tabiques', 'Estructura', 24, 1, true),
('Instalacion de puertas', 'Carpintería', 8, 2, true),
('Piso flotante', 'Pisos', 16, 3, true),
('Cornisas', 'Terminaciones', 6, 4, true)
ON CONFLICT DO NOTHING;

-- Verificar que se crearon correctamente
SELECT * FROM public.task_templates WHERE is_active = true ORDER BY sort_order;

-- Comentarios explicativos:
-- Esta tabla task_templates es solo para las PLANTILLAS de tareas
-- Cuando se crea un apartamento, se seleccionan tareas de esta tabla
-- Pero las tareas reales del apartamento se guardan en apartment_tasks
-- Es decir: task_templates = plantillas, apartment_tasks = tareas reales


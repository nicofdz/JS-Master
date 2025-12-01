-- =====================================================
-- AGREGAR CAMPOS DE SOFT DELETE A task_assignment_materials
-- =====================================================

-- Agregar campos para soft delete
ALTER TABLE public.task_assignment_materials
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Crear índice para mejorar consultas
CREATE INDEX IF NOT EXISTS idx_task_assignment_materials_is_deleted 
ON public.task_assignment_materials(is_deleted);

CREATE INDEX IF NOT EXISTS idx_task_assignment_materials_task_assignment_id 
ON public.task_assignment_materials(task_assignment_id);

-- Comentarios
COMMENT ON COLUMN public.task_assignment_materials.is_deleted IS 'Indica si el material asociado fue eliminado (soft delete)';
COMMENT ON COLUMN public.task_assignment_materials.deleted_at IS 'Fecha y hora en que se eliminó el material asociado';
COMMENT ON COLUMN public.task_assignment_materials.updated_at IS 'Fecha y hora de última actualización';


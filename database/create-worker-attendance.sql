-- Crear tabla de asistencia de trabajadores
CREATE TABLE IF NOT EXISTS public.worker_attendance (
  id SERIAL PRIMARY KEY,
  worker_id INTEGER NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
  project_id INTEGER REFERENCES public.projects(id) ON DELETE SET NULL,
  attendance_date DATE NOT NULL,
  is_present BOOLEAN DEFAULT true,
  check_in_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  -- Evitar duplicados: un trabajador solo puede tener un registro por día y proyecto
  UNIQUE(worker_id, attendance_date, project_id)
);

-- Índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_attendance_worker ON public.worker_attendance(worker_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON public.worker_attendance(attendance_date);
CREATE INDEX IF NOT EXISTS idx_attendance_project ON public.worker_attendance(project_id);

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.worker_attendance ENABLE ROW LEVEL SECURITY;

-- Política: Los usuarios autenticados pueden ver todas las asistencias
CREATE POLICY "Los usuarios pueden ver asistencias"
  ON public.worker_attendance
  FOR SELECT
  TO authenticated
  USING (true);

-- Política: Los usuarios autenticados pueden insertar asistencias
CREATE POLICY "Los usuarios pueden crear asistencias"
  ON public.worker_attendance
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Política: Los usuarios autenticados pueden actualizar asistencias
CREATE POLICY "Los usuarios pueden actualizar asistencias"
  ON public.worker_attendance
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Política: Los usuarios autenticados pueden eliminar asistencias
CREATE POLICY "Los usuarios pueden eliminar asistencias"
  ON public.worker_attendance
  FOR DELETE
  TO authenticated
  USING (true);

-- Comentarios
COMMENT ON TABLE public.worker_attendance IS 'Registro de asistencia diaria de trabajadores';
COMMENT ON COLUMN public.worker_attendance.worker_id IS 'ID del trabajador';
COMMENT ON COLUMN public.worker_attendance.project_id IS 'ID del proyecto (opcional, null si es asistencia general)';
COMMENT ON COLUMN public.worker_attendance.attendance_date IS 'Fecha de la asistencia';
COMMENT ON COLUMN public.worker_attendance.is_present IS 'Si el trabajador estuvo presente';
COMMENT ON COLUMN public.worker_attendance.check_in_time IS 'Hora de registro de asistencia';
COMMENT ON COLUMN public.worker_attendance.notes IS 'Notas o justificaciones (ej: llegó tarde, permiso médico)';


<<<<<<< HEAD
=======

>>>>>>> 5b12c23a03c59a530b62e17c08f8d6ba5d623620

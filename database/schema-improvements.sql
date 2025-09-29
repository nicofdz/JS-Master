-- =====================================================
-- MEJORAS AL ESQUEMA DE BASE DE DATOS
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- =====================================================
-- 1. MEJORAR TABLA DE EQUIPOS (teams)
-- =====================================================

-- Agregar relación con user_profiles para supervisor
ALTER TABLE public.teams 
ADD COLUMN IF NOT EXISTS supervisor_id UUID REFERENCES public.user_profiles(id);

-- Agregar campos adicionales importantes
ALTER TABLE public.teams 
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS max_capacity INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS current_workload INTEGER DEFAULT 0;

-- =====================================================
-- 2. MEJORAR TABLA DE ACTIVIDADES POR APARTAMENTO
-- =====================================================

-- Agregar relación con user_profiles para supervisor
ALTER TABLE public.apartment_activities 
ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES public.user_profiles(id);

-- Agregar campos de seguimiento
ALTER TABLE public.apartment_activities 
ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
ADD COLUMN IF NOT EXISTS estimated_cost DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS actual_cost DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS quality_rating INTEGER CHECK (quality_rating >= 1 AND quality_rating <= 5);

-- =====================================================
-- 3. MEJORAR TABLA DE APARTAMENTOS
-- =====================================================

-- Agregar campos de seguimiento
ALTER TABLE public.apartments 
ADD COLUMN IF NOT EXISTS floor_area DECIMAL(8,2), -- área del piso
ADD COLUMN IF NOT EXISTS balcony_area DECIMAL(8,2), -- área de balcón
ADD COLUMN IF NOT EXISTS parking_spaces INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS notes TEXT;

-- =====================================================
-- 4. MEJORAR TABLA DE PISOS
-- =====================================================

-- Agregar campos de seguimiento
ALTER TABLE public.floors 
ADD COLUMN IF NOT EXISTS floor_height DECIMAL(5,2), -- altura del piso en metros
ADD COLUMN IF NOT EXISTS notes TEXT;

-- =====================================================
-- 5. MEJORAR TABLA DE PROYECTOS
-- =====================================================

-- Agregar campos de seguimiento
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS budget DECIMAL(15,2), -- presupuesto total
ADD COLUMN IF NOT EXISTS current_cost DECIMAL(15,2) DEFAULT 0, -- costo actual
ADD COLUMN IF NOT EXISTS client_name VARCHAR(255), -- nombre del cliente
ADD COLUMN IF NOT EXISTS client_phone VARCHAR(20), -- teléfono del cliente
ADD COLUMN IF NOT EXISTS client_email VARCHAR(255), -- email del cliente
ADD COLUMN IF NOT EXISTS notes TEXT;

-- =====================================================
-- 6. CREAR TABLA DE MATERIALES
-- =====================================================

CREATE TABLE IF NOT EXISTS public.materials (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL, -- Cemento, Ladrillos, Pintura, etc.
  unit VARCHAR(50) NOT NULL, -- kg, m2, m3, etc.
  unit_cost DECIMAL(10,2) NOT NULL,
  supplier VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 7. CREAR TABLA DE MATERIALES POR ACTIVIDAD
-- =====================================================

CREATE TABLE IF NOT EXISTS public.activity_materials (
  id SERIAL PRIMARY KEY,
  apartment_activity_id INTEGER REFERENCES public.apartment_activities(id) ON DELETE CASCADE,
  material_id INTEGER REFERENCES public.materials(id),
  quantity DECIMAL(10,2) NOT NULL,
  unit_cost DECIMAL(10,2) NOT NULL,
  total_cost DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 8. CREAR TABLA DE DOCUMENTOS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.project_documents (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES public.projects(id) ON DELETE CASCADE,
  document_type VARCHAR(100) NOT NULL, -- Planos, Contratos, Permisos, etc.
  file_name VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  uploaded_by UUID REFERENCES public.user_profiles(id),
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  description TEXT
);

-- =====================================================
-- 9. CREAR TABLA DE NOTIFICACIONES
-- =====================================================

CREATE TABLE IF NOT EXISTS public.notifications (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('info', 'warning', 'error', 'success')),
  is_read BOOLEAN DEFAULT false,
  related_table VARCHAR(100), -- projects, floors, apartments, etc.
  related_id INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 10. CREAR TABLA DE AUDITORÍA
-- =====================================================

CREATE TABLE IF NOT EXISTS public.audit_log (
  id SERIAL PRIMARY KEY,
  table_name VARCHAR(100) NOT NULL,
  record_id INTEGER NOT NULL,
  action VARCHAR(50) NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_values JSONB,
  new_values JSONB,
  user_id UUID REFERENCES public.user_profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 11. AGREGAR TRIGGERS PARA AUDITORÍA
-- =====================================================

-- Función para auditoría
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        INSERT INTO public.audit_log (table_name, record_id, action, old_values, user_id)
        VALUES (TG_TABLE_NAME, OLD.id, TG_OP, row_to_json(OLD), auth.uid());
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO public.audit_log (table_name, record_id, action, old_values, new_values, user_id)
        VALUES (TG_TABLE_NAME, NEW.id, TG_OP, row_to_json(OLD), row_to_json(NEW), auth.uid());
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO public.audit_log (table_name, record_id, action, new_values, user_id)
        VALUES (TG_TABLE_NAME, NEW.id, TG_OP, row_to_json(NEW), auth.uid());
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

-- Aplicar triggers de auditoría a tablas principales
CREATE TRIGGER audit_projects AFTER INSERT OR UPDATE OR DELETE ON public.projects FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
CREATE TRIGGER audit_floors AFTER INSERT OR UPDATE OR DELETE ON public.floors FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
CREATE TRIGGER audit_apartments AFTER INSERT OR UPDATE OR DELETE ON public.apartments FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
CREATE TRIGGER audit_apartment_activities AFTER INSERT OR UPDATE OR DELETE ON public.apartment_activities FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- =====================================================
-- 12. CREAR VISTAS MEJORADAS
-- =====================================================

-- Vista de progreso por piso
CREATE OR REPLACE VIEW public.floor_progress AS
SELECT 
  f.id,
  f.project_id,
  f.floor_number,
  f.status,
  p.name as project_name,
  COUNT(DISTINCT a.id) as apartments_created,
  COUNT(DISTINCT CASE WHEN a.status = 'completed' THEN a.id END) as apartments_completed,
  COUNT(DISTINCT aa.id) as total_activities,
  COUNT(DISTINCT CASE WHEN aa.status = 'completed' THEN aa.id END) as activities_completed,
  CASE 
    WHEN COUNT(DISTINCT aa.id) > 0 
    THEN ROUND((COUNT(DISTINCT CASE WHEN aa.status = 'completed' THEN aa.id END) * 100.0) / COUNT(DISTINCT aa.id), 2)
    ELSE 0 
  END as progress_percentage
FROM public.floors f
LEFT JOIN public.projects p ON f.project_id = p.id
LEFT JOIN public.apartments a ON f.id = a.floor_id
LEFT JOIN public.apartment_activities aa ON a.id = aa.apartment_id
GROUP BY f.id, f.project_id, f.floor_number, f.status, p.name;

-- Vista de progreso por apartamento
CREATE OR REPLACE VIEW public.apartment_progress AS
SELECT 
  a.id,
  a.floor_id,
  a.apartment_number,
  a.apartment_type,
  a.status,
  f.floor_number,
  p.name as project_name,
  COUNT(DISTINCT aa.id) as total_activities,
  COUNT(DISTINCT CASE WHEN aa.status = 'completed' THEN aa.id END) as activities_completed,
  CASE 
    WHEN COUNT(DISTINCT aa.id) > 0 
    THEN ROUND((COUNT(DISTINCT CASE WHEN aa.status = 'completed' THEN aa.id END) * 100.0) / COUNT(DISTINCT aa.id), 2)
    ELSE 0 
  END as progress_percentage
FROM public.apartments a
LEFT JOIN public.floors f ON a.floor_id = f.id
LEFT JOIN public.projects p ON f.project_id = p.id
LEFT JOIN public.apartment_activities aa ON a.id = aa.apartment_id
GROUP BY a.id, a.floor_id, a.apartment_number, a.apartment_type, a.status, f.floor_number, p.name;

-- =====================================================
-- 13. AGREGAR ÍNDICES ADICIONALES
-- =====================================================

-- Índices para nuevas tablas
CREATE INDEX IF NOT EXISTS idx_materials_category ON public.materials(category);
CREATE INDEX IF NOT EXISTS idx_activity_materials_activity_id ON public.activity_materials(apartment_activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_materials_material_id ON public.activity_materials(material_id);
CREATE INDEX IF NOT EXISTS idx_project_documents_project_id ON public.project_documents(project_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_audit_log_table_name ON public.audit_log(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON public.audit_log(created_at);

-- =====================================================
-- 14. AGREGAR RLS A NUEVAS TABLAS
-- =====================================================

ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Políticas para nuevas tablas
CREATE POLICY "Authenticated users can view materials" ON public.materials FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can view activity materials" ON public.activity_materials FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can view project documents" ON public.project_documents FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view audit log" ON public.audit_log FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin')
);

-- =====================================================
-- 15. AGREGAR TRIGGERS DE ACTUALIZACIÓN
-- =====================================================

CREATE TRIGGER update_materials_updated_at BEFORE UPDATE ON public.materials FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_activity_materials_updated_at BEFORE UPDATE ON public.activity_materials FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 16. COMENTARIOS EN NUEVAS TABLAS
-- =====================================================

COMMENT ON TABLE public.materials IS 'Catálogo de materiales de construcción';
COMMENT ON TABLE public.activity_materials IS 'Materiales utilizados en cada actividad';
COMMENT ON TABLE public.project_documents IS 'Documentos del proyecto (planos, contratos, etc.)';
COMMENT ON TABLE public.notifications IS 'Notificaciones del sistema para usuarios';
COMMENT ON TABLE public.audit_log IS 'Registro de auditoría de cambios en el sistema';

-- =====================================================
-- 17. MENSAJE DE CONFIRMACIÓN
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE 'Mejoras al esquema aplicadas exitosamente!';
    RAISE NOTICE 'Nuevas tablas: materials, activity_materials, project_documents, notifications, audit_log';
    RAISE NOTICE 'Campos adicionales agregados a tablas existentes';
    RAISE NOTICE 'Vistas mejoradas creadas';
    RAISE NOTICE 'Triggers de auditoría configurados';
END $$;


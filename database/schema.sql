-- =====================================================
-- SCHEMA COMPLETO PARA SISTEMA DE CONTROL DE TERMINACIONES
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABLA DE PERFILES DE USUARIO
-- =====================================================
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'supervisor', 'jefe_cuadrilla', 'maestro')),
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABLA DE SESIONES DE USUARIO
-- =====================================================
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  login_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT
);

-- =====================================================
-- TABLA DE PROYECTOS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.projects (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  address TEXT,
  total_floors INTEGER NOT NULL DEFAULT 1,
  units_per_floor INTEGER NOT NULL DEFAULT 1,
  start_date DATE,
  estimated_completion DATE,
  actual_completion DATE,
  status VARCHAR(50) DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'completed', 'paused')),
  created_by UUID REFERENCES public.user_profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABLA DE PISOS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.floors (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES public.projects(id) ON DELETE CASCADE,
  floor_number INTEGER NOT NULL,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'in-progress', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(project_id, floor_number)
);

-- =====================================================
-- TABLA DE APARTAMENTOS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.apartments (
  id SERIAL PRIMARY KEY,
  floor_id INTEGER REFERENCES public.floors(id) ON DELETE CASCADE,
  apartment_number VARCHAR(20) NOT NULL,
  apartment_type VARCHAR(100), -- 3D+2B, 2D+1B, etc.
  area DECIMAL(8,2), -- metros cuadrados
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'in-progress', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(floor_id, apartment_number)
);

-- =====================================================
-- TABLA DE PLANTILLAS DE ACTIVIDADES
-- =====================================================
CREATE TABLE IF NOT EXISTS public.activity_templates (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL, -- Estructura, Instalaciones, Acabados, etc.
  estimated_hours INTEGER NOT NULL DEFAULT 8,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABLA DE ACTIVIDADES POR APARTAMENTO
-- =====================================================
CREATE TABLE IF NOT EXISTS public.apartment_activities (
  id SERIAL PRIMARY KEY,
  apartment_id INTEGER REFERENCES public.apartments(id) ON DELETE CASCADE,
  activity_template_id INTEGER REFERENCES public.activity_templates(id),
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'in-progress', 'completed', 'blocked')),
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  start_date DATE,
  end_date DATE,
  estimated_hours INTEGER DEFAULT 8,
  actual_hours INTEGER DEFAULT 0,
  team_id INTEGER,
  supervisor_name VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABLA DE EQUIPOS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.teams (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  specialty VARCHAR(100) NOT NULL,
  supervisor_name VARCHAR(255) NOT NULL,
  supervisor_phone VARCHAR(20),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABLA DE FOTOS DE PROGRESO
-- =====================================================
CREATE TABLE IF NOT EXISTS public.progress_photos (
  id SERIAL PRIMARY KEY,
  apartment_activity_id INTEGER REFERENCES public.apartment_activities(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name VARCHAR(255),
  file_size INTEGER,
  uploaded_by UUID REFERENCES public.user_profiles(id),
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  description TEXT
);

-- =====================================================
-- TABLA DE PROBLEMAS/ISSUES
-- =====================================================
CREATE TABLE IF NOT EXISTS public.activity_issues (
  id SERIAL PRIMARY KEY,
  apartment_activity_id INTEGER REFERENCES public.apartment_activities(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL CHECK (type IN ('material', 'dependency', 'quality', 'safety', 'other')),
  description TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'in-progress', 'resolved', 'closed')),
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  reported_by UUID REFERENCES public.user_profiles(id),
  assigned_to UUID REFERENCES public.user_profiles(id),
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- FUNCIONES PARA ACTUALIZAR TIMESTAMPS
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- =====================================================
-- TRIGGERS PARA AUTO-UPDATE DE TIMESTAMPS
-- =====================================================
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON public.user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_floors_updated_at BEFORE UPDATE ON public.floors FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_apartments_updated_at BEFORE UPDATE ON public.apartments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_activity_templates_updated_at BEFORE UPDATE ON public.activity_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_apartment_activities_updated_at BEFORE UPDATE ON public.apartment_activities FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON public.teams FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_activity_issues_updated_at BEFORE UPDATE ON public.activity_issues FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.floors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apartments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apartment_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_issues ENABLE ROW LEVEL SECURITY;

-- Políticas para user_profiles
CREATE POLICY "Users can view own profile" ON public.user_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.user_profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON public.user_profiles FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Políticas para proyectos (todos los usuarios autenticados pueden ver)
CREATE POLICY "Authenticated users can view projects" ON public.projects FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins and supervisors can manage projects" ON public.projects FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('admin', 'supervisor'))
);

-- Políticas para pisos y apartamentos
CREATE POLICY "Authenticated users can view floors" ON public.floors FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can view apartments" ON public.apartments FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Supervisors can manage floors and apartments" ON public.floors FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('admin', 'supervisor'))
);
CREATE POLICY "Supervisors can manage apartments" ON public.apartments FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('admin', 'supervisor'))
);

-- Políticas para actividades
CREATE POLICY "Authenticated users can view activities" ON public.apartment_activities FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Workers can update their activities" ON public.apartment_activities FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid())
);

-- Políticas para fotos
CREATE POLICY "Authenticated users can view photos" ON public.progress_photos FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can upload photos" ON public.progress_photos FOR INSERT WITH CHECK (auth.uid() = uploaded_by);

-- =====================================================
-- ÍNDICES PARA OPTIMIZAR RENDIMIENTO
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status);
CREATE INDEX IF NOT EXISTS idx_floors_project_id ON public.floors(project_id);
CREATE INDEX IF NOT EXISTS idx_apartments_floor_id ON public.apartments(floor_id);
CREATE INDEX IF NOT EXISTS idx_apartment_activities_apartment_id ON public.apartment_activities(apartment_id);
CREATE INDEX IF NOT EXISTS idx_apartment_activities_status ON public.apartment_activities(status);
CREATE INDEX IF NOT EXISTS idx_progress_photos_activity_id ON public.progress_photos(apartment_activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_issues_status ON public.activity_issues(status);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON public.user_profiles(role);

-- =====================================================
-- VISTAS ÚTILES PARA REPORTES
-- =====================================================

-- Vista de progreso por proyecto
CREATE OR REPLACE VIEW public.project_progress AS
SELECT 
  p.id,
  p.name,
  p.address,
  p.total_floors,
  p.units_per_floor,
  p.status,
  COUNT(DISTINCT f.id) as floors_created,
  COUNT(DISTINCT a.id) as apartments_created,
  COUNT(DISTINCT CASE WHEN aa.status = 'completed' THEN aa.id END) as activities_completed,
  COUNT(DISTINCT aa.id) as total_activities,
  CASE 
    WHEN COUNT(DISTINCT aa.id) > 0 
    THEN ROUND((COUNT(DISTINCT CASE WHEN aa.status = 'completed' THEN aa.id END) * 100.0) / COUNT(DISTINCT aa.id), 2)
    ELSE 0 
  END as progress_percentage
FROM public.projects p
LEFT JOIN public.floors f ON p.id = f.project_id
LEFT JOIN public.apartments a ON f.id = a.floor_id
LEFT JOIN public.apartment_activities aa ON a.id = aa.apartment_id
GROUP BY p.id, p.name, p.address, p.total_floors, p.units_per_floor, p.status;

-- Vista de actividades pendientes por equipo
CREATE OR REPLACE VIEW public.pending_activities_by_team AS
SELECT 
  t.name as team_name,
  t.specialty,
  t.supervisor_name,
  COUNT(aa.id) as pending_activities,
  STRING_AGG(DISTINCT p.name, ', ') as projects
FROM public.teams t
LEFT JOIN public.apartment_activities aa ON t.id = aa.team_id AND aa.status IN ('pending', 'in-progress')
LEFT JOIN public.apartments a ON aa.apartment_id = a.id
LEFT JOIN public.floors f ON a.floor_id = f.id
LEFT JOIN public.projects p ON f.project_id = p.id
WHERE t.is_active = true
GROUP BY t.id, t.name, t.specialty, t.supervisor_name;

-- =====================================================
-- COMENTARIOS EN LAS TABLAS
-- =====================================================
COMMENT ON TABLE public.user_profiles IS 'Perfiles de usuarios del sistema con roles específicos';
COMMENT ON TABLE public.projects IS 'Proyectos de construcción principales';
COMMENT ON TABLE public.floors IS 'Pisos de cada proyecto';
COMMENT ON TABLE public.apartments IS 'Apartamentos/unidades por piso';
COMMENT ON TABLE public.activity_templates IS 'Plantillas de actividades reutilizables';
COMMENT ON TABLE public.apartment_activities IS 'Actividades específicas por apartamento';
COMMENT ON TABLE public.teams IS 'Equipos de trabajo especializados';
COMMENT ON TABLE public.progress_photos IS 'Fotos de progreso de las actividades';
COMMENT ON TABLE public.activity_issues IS 'Problemas e incidencias reportadas';

-- =====================================================
-- MENSAJE DE CONFIRMACIÓN
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE 'Schema del Sistema de Control de Terminaciones creado exitosamente!';
    RAISE NOTICE 'Tablas creadas: %, %, %, %, %, %, %, %, %', 
        'user_profiles', 'projects', 'floors', 'apartments', 'activity_templates',
        'apartment_activities', 'teams', 'progress_photos', 'activity_issues';
    RAISE NOTICE 'RLS habilitado y políticas configuradas';
    RAISE NOTICE 'Índices y vistas creados para optimización';
END $$;

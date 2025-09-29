-- =====================================================
-- DATOS DE EJEMPLO PARA SISTEMA DE CONTROL DE TERMINACIONES
-- Ejecutar DESPUÉS del schema.sql
-- =====================================================

-- =====================================================
-- INSERTAR PLANTILLAS DE ACTIVIDADES
-- =====================================================
INSERT INTO public.activity_templates (name, category, estimated_hours, sort_order) VALUES
('Tabiquería', 'Estructura', 24, 1),
('Instalación Eléctrica', 'Instalaciones', 16, 2),
('Instalación Sanitaria', 'Instalaciones', 20, 3),
('Instalación de Gas', 'Instalaciones', 12, 4),
('Estuco/Yeso', 'Acabados', 32, 5),
('Pintura', 'Acabados', 24, 6),
('Piso Flotante', 'Pisos', 16, 7),
('Cerámica Baños', 'Pisos', 20, 8),
('Puertas Interiores', 'Carpintería', 8, 9),
('Closets', 'Carpintería', 16, 10),
('Muebles de Cocina', 'Carpintería', 24, 11),
('Accesorios y Grifería', 'Terminaciones', 6, 12),
('Artefactos Sanitarios', 'Terminaciones', 8, 13),
('Luminarias', 'Terminaciones', 4, 14),
('Limpieza Final', 'Terminaciones', 6, 15)
ON CONFLICT DO NOTHING;

-- =====================================================
-- INSERTAR EQUIPOS DE TRABAJO
-- =====================================================
INSERT INTO public.teams (name, specialty, supervisor_name, supervisor_phone) VALUES
('Equipo Albañilería A', 'Estructura y Tabiquería', 'Carlos Mendoza', '+56912345678'),
('Equipo Albañilería B', 'Estructura y Tabiquería', 'Roberto Silva', '+56912345679'),
('Equipo Eléctrico', 'Instalaciones Eléctricas', 'José Ramírez', '+56912345680'),
('Equipo Gasfitería', 'Instalaciones Sanitarias', 'Miguel Torres', '+56912345681'),
('Equipo Gas', 'Instalaciones de Gas', 'Pedro Morales', '+56912345682'),
('Equipo Estuco A', 'Acabados y Estuco', 'Antonio Silva', '+56912345683'),
('Equipo Estuco B', 'Acabados y Estuco', 'Fernando López', '+56912345684'),
('Equipo Pintura A', 'Pintura', 'Luis González', '+56912345685'),
('Equipo Pintura B', 'Pintura', 'Manuel Herrera', '+56912345686'),
('Equipo Pisos', 'Instalación de Pisos', 'Roberto Vega', '+56912345687'),
('Equipo Cerámica', 'Cerámica y Azulejos', 'Andrés Castro', '+56912345688'),
('Equipo Carpintería A', 'Puertas y Closets', 'Fernando Rojas', '+56912345689'),
('Equipo Carpintería B', 'Muebles de Cocina', 'Patricio Muñoz', '+56912345690'),
('Equipo Terminaciones', 'Accesorios y Grifería', 'Patricia Morales', '+56912345691'),
('Equipo Limpieza', 'Limpieza y Entrega', 'María González', '+56912345692')
ON CONFLICT DO NOTHING;

-- =====================================================
-- INSERTAR PROYECTOS DE EJEMPLO
-- =====================================================
INSERT INTO public.projects (name, address, total_floors, units_per_floor, start_date, estimated_completion, status) VALUES
('Edificio Los Robles', 'Av. Las Condes 1234, Las Condes', 15, 4, '2024-01-15', '2024-12-15', 'active'),
('Condominio Vista Hermosa', 'Av. Providencia 5678, Providencia', 8, 6, '2024-03-01', '2025-03-20', 'active'),
('Torre Central', 'Av. Apoquindo 9876, Las Condes', 20, 2, '2023-10-01', '2024-10-30', 'active'),
('Residencial El Bosque', 'Av. El Bosque Norte 4321, Las Condes', 12, 3, '2024-06-01', '2025-08-15', 'planning'),
('Edificio Panorama', 'Av. Vitacura 8765, Vitacura', 18, 4, '2024-02-15', '2025-01-30', 'active')
ON CONFLICT DO NOTHING;

-- =====================================================
-- INSERTAR PISOS PARA CADA PROYECTO
-- =====================================================

-- Pisos para Edificio Los Robles (15 pisos)
INSERT INTO public.floors (project_id, floor_number, status)
SELECT 1, floor_num, 
  CASE 
    WHEN floor_num <= 10 THEN 'completed'
    WHEN floor_num <= 12 THEN 'in-progress'
    ELSE 'pending'
  END
FROM generate_series(1, 15) AS floor_num
ON CONFLICT DO NOTHING;

-- Pisos para Condominio Vista Hermosa (8 pisos)
INSERT INTO public.floors (project_id, floor_number, status)
SELECT 2, floor_num,
  CASE 
    WHEN floor_num <= 4 THEN 'completed'
    WHEN floor_num <= 6 THEN 'in-progress'
    ELSE 'pending'
  END
FROM generate_series(1, 8) AS floor_num
ON CONFLICT DO NOTHING;

-- Pisos para Torre Central (20 pisos)
INSERT INTO public.floors (project_id, floor_number, status)
SELECT 3, floor_num,
  CASE 
    WHEN floor_num <= 18 THEN 'completed'
    WHEN floor_num <= 19 THEN 'in-progress'
    ELSE 'pending'
  END
FROM generate_series(1, 20) AS floor_num
ON CONFLICT DO NOTHING;

-- Pisos para Residencial El Bosque (12 pisos)
INSERT INTO public.floors (project_id, floor_number, status)
SELECT 4, floor_num, 'pending'
FROM generate_series(1, 12) AS floor_num
ON CONFLICT DO NOTHING;

-- Pisos para Edificio Panorama (18 pisos)
INSERT INTO public.floors (project_id, floor_number, status)
SELECT 5, floor_num,
  CASE 
    WHEN floor_num <= 8 THEN 'completed'
    WHEN floor_num <= 12 THEN 'in-progress'
    ELSE 'pending'
  END
FROM generate_series(1, 18) AS floor_num
ON CONFLICT DO NOTHING;

-- =====================================================
-- INSERTAR APARTAMENTOS
-- =====================================================

-- Función para generar apartamentos por piso
DO $$
DECLARE
    floor_record RECORD;
    apt_num INTEGER;
    apt_type TEXT;
    apt_area DECIMAL;
BEGIN
    -- Iterar sobre todos los pisos
    FOR floor_record IN 
        SELECT f.id, f.floor_number, p.units_per_floor, p.id as project_id
        FROM public.floors f 
        JOIN public.projects p ON f.project_id = p.id
    LOOP
        -- Crear apartamentos para cada piso
        FOR apt_num IN 1..floor_record.units_per_floor LOOP
            -- Determinar tipo de apartamento y área
            CASE 
                WHEN apt_num = 1 THEN 
                    apt_type := '3D+2B'; 
                    apt_area := 85.5;
                WHEN apt_num = 2 THEN 
                    apt_type := '2D+1B'; 
                    apt_area := 65.0;
                WHEN apt_num = 3 THEN 
                    apt_type := '3D+2B'; 
                    apt_area := 90.0;
                WHEN apt_num = 4 THEN 
                    apt_type := '2D+2B'; 
                    apt_area := 75.5;
                WHEN apt_num = 5 THEN 
                    apt_type := '1D+1B'; 
                    apt_area := 45.0;
                ELSE 
                    apt_type := '2D+1B'; 
                    apt_area := 60.0;
            END CASE;
            
            -- Insertar apartamento
            INSERT INTO public.apartments (floor_id, apartment_number, apartment_type, area, status)
            VALUES (
                floor_record.id,
                floor_record.floor_number || LPAD(apt_num::TEXT, 2, '0'),
                apt_type,
                apt_area,
                CASE 
                    WHEN floor_record.floor_number <= 8 THEN 'completed'
                    WHEN floor_record.floor_number <= 12 THEN 'in-progress'
                    ELSE 'pending'
                END
            )
            ON CONFLICT DO NOTHING;
        END LOOP;
    END LOOP;
END $$;

-- =====================================================
-- INSERTAR ACTIVIDADES PARA APARTAMENTOS
-- =====================================================

-- Función para crear actividades por apartamento
DO $$
DECLARE
    apt_record RECORD;
    template_record RECORD;
    activity_status TEXT;
    activity_progress INTEGER;
    team_assignment INTEGER;
BEGIN
    -- Iterar sobre apartamentos completados o en progreso
    FOR apt_record IN 
        SELECT a.id, a.status, f.floor_number, p.name as project_name
        FROM public.apartments a 
        JOIN public.floors f ON a.floor_id = f.id
        JOIN public.projects p ON f.project_id = p.id
        WHERE a.status IN ('completed', 'in-progress')
    LOOP
        -- Crear actividades basadas en las plantillas
        FOR template_record IN 
            SELECT id, name, category, estimated_hours, sort_order
            FROM public.activity_templates 
            ORDER BY sort_order
        LOOP
            -- Determinar estado y progreso según el apartamento
            IF apt_record.status = 'completed' THEN
                activity_status := 'completed';
                activity_progress := 100;
            ELSE
                -- Para apartamentos en progreso, variar el estado
                CASE template_record.sort_order
                    WHEN 1,2,3,4,5 THEN 
                        activity_status := 'completed';
                        activity_progress := 100;
                    WHEN 6,7,8 THEN 
                        activity_status := 'in-progress';
                        activity_progress := FLOOR(RANDOM() * 50 + 25); -- 25-75%
                    ELSE 
                        activity_status := 'pending';
                        activity_progress := 0;
                END CASE;
            END IF;
            
            -- Asignar equipo basado en la especialidad
            team_assignment := CASE template_record.category
                WHEN 'Estructura' THEN 1 + (FLOOR(RANDOM() * 2))  -- Equipos 1-2
                WHEN 'Instalaciones' THEN 3 + (FLOOR(RANDOM() * 3))  -- Equipos 3-5
                WHEN 'Acabados' THEN 6 + (FLOOR(RANDOM() * 4))  -- Equipos 6-9
                WHEN 'Pisos' THEN 10 + (FLOOR(RANDOM() * 2))  -- Equipos 10-11
                WHEN 'Carpintería' THEN 12 + (FLOOR(RANDOM() * 2))  -- Equipos 12-13
                WHEN 'Terminaciones' THEN 14 + (FLOOR(RANDOM() * 2))  -- Equipos 14-15
                ELSE 1
            END;
            
            -- Insertar actividad
            INSERT INTO public.apartment_activities (
                apartment_id, 
                activity_template_id, 
                status, 
                progress, 
                estimated_hours,
                actual_hours,
                team_id,
                start_date,
                end_date
            ) VALUES (
                apt_record.id,
                template_record.id,
                activity_status,
                activity_progress,
                template_record.estimated_hours,
                CASE WHEN activity_status = 'completed' 
                     THEN template_record.estimated_hours + FLOOR(RANDOM() * 8 - 4) -- ±4 horas
                     ELSE FLOOR(activity_progress * template_record.estimated_hours / 100.0)
                END,
                team_assignment,
                CASE WHEN activity_status != 'pending' 
                     THEN CURRENT_DATE - INTERVAL '30 days' + (template_record.sort_order || ' days')::INTERVAL
                     ELSE NULL
                END,
                CASE WHEN activity_status = 'completed' 
                     THEN CURRENT_DATE - INTERVAL '20 days' + (template_record.sort_order || ' days')::INTERVAL
                     ELSE NULL
                END
            )
            ON CONFLICT DO NOTHING;
            
        END LOOP;
    END LOOP;
END $$;

-- =====================================================
-- INSERTAR ALGUNOS ISSUES DE EJEMPLO
-- =====================================================
INSERT INTO public.activity_issues (apartment_activity_id, type, description, status, priority) 
SELECT 
    aa.id,
    CASE FLOOR(RANDOM() * 5)
        WHEN 0 THEN 'material'
        WHEN 1 THEN 'dependency'
        WHEN 2 THEN 'quality'
        WHEN 3 THEN 'safety'
        ELSE 'other'
    END,
    CASE FLOOR(RANDOM() * 5)
        WHEN 0 THEN 'Falta material para completar la actividad'
        WHEN 1 THEN 'Esperando finalización de actividad anterior'
        WHEN 2 THEN 'Requiere revisión de calidad antes de continuar'
        WHEN 3 THEN 'Problema de seguridad detectado en el área'
        ELSE 'Consulta técnica pendiente'
    END,
    CASE FLOOR(RANDOM() * 3)
        WHEN 0 THEN 'open'
        WHEN 1 THEN 'in-progress'
        ELSE 'resolved'
    END,
    CASE FLOOR(RANDOM() * 4)
        WHEN 0 THEN 'low'
        WHEN 1 THEN 'medium'
        WHEN 2 THEN 'high'
        ELSE 'critical'
    END
FROM public.apartment_activities aa
WHERE aa.status IN ('in-progress', 'blocked')
AND RANDOM() < 0.3  -- Solo 30% de actividades en progreso tienen issues
LIMIT 50
ON CONFLICT DO NOTHING;

-- =====================================================
-- ACTUALIZAR REFERENCIAS DE EQUIPOS EN ACTIVIDADES
-- =====================================================
UPDATE public.apartment_activities 
SET supervisor_name = t.supervisor_name
FROM public.teams t 
WHERE public.apartment_activities.team_id = t.id;

-- =====================================================
-- MENSAJE DE CONFIRMACIÓN
-- =====================================================
DO $$
DECLARE
    project_count INTEGER;
    floor_count INTEGER;
    apartment_count INTEGER;
    activity_count INTEGER;
    team_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO project_count FROM public.projects;
    SELECT COUNT(*) INTO floor_count FROM public.floors;
    SELECT COUNT(*) INTO apartment_count FROM public.apartments;
    SELECT COUNT(*) INTO activity_count FROM public.apartment_activities;
    SELECT COUNT(*) INTO team_count FROM public.teams;
    
    RAISE NOTICE '=== DATOS DE EJEMPLO INSERTADOS EXITOSAMENTE ===';
    RAISE NOTICE 'Proyectos: %', project_count;
    RAISE NOTICE 'Pisos: %', floor_count;
    RAISE NOTICE 'Apartamentos: %', apartment_count;
    RAISE NOTICE 'Actividades: %', activity_count;
    RAISE NOTICE 'Equipos: %', team_count;
    RAISE NOTICE 'Plantillas de actividades: 15';
    RAISE NOTICE '=== SISTEMA LISTO PARA USAR ===';
END $$;

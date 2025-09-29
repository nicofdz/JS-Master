-- =====================================================
-- USUARIOS DEMO PARA SISTEMA DE CONTROL DE TERMINACIONES
-- Ejecutar DESPUÉS de schema.sql y seed.sql
-- =====================================================

-- IMPORTANTE: Estos usuarios demo deben crearse manualmente en Supabase Auth
-- Este script solo crea los perfiles asociados

-- =====================================================
-- INSERTAR PERFILES DE USUARIOS DEMO
-- =====================================================

-- NOTA: Los IDs deben coincidir con los usuarios creados en Supabase Auth
-- Reemplaza estos UUIDs con los reales de tu proyecto Supabase

-- Usuario Admin Demo
INSERT INTO public.user_profiles (id, email, full_name, role, phone) VALUES 
('11111111-1111-1111-1111-111111111111', 'admin@demo.com', 'Administrador Demo', 'admin', '+56912345678')
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  phone = EXCLUDED.phone;

-- Usuario Supervisor Demo  
INSERT INTO public.user_profiles (id, email, full_name, role, phone) VALUES 
('22222222-2222-2222-2222-222222222222', 'supervisor@demo.com', 'Supervisor Demo', 'supervisor', '+56912345679')
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  phone = EXCLUDED.phone;

-- Usuario Jefe de Cuadrilla Demo
INSERT INTO public.user_profiles (id, email, full_name, role, phone) VALUES 
('33333333-3333-3333-3333-333333333333', 'jefe@demo.com', 'Jefe Cuadrilla Demo', 'jefe_cuadrilla', '+56912345680')
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  phone = EXCLUDED.phone;

-- Usuario Maestro Demo
INSERT INTO public.user_profiles (id, email, full_name, role, phone) VALUES 
('44444444-4444-4444-4444-444444444444', 'maestro@demo.com', 'Maestro Demo', 'maestro', '+56912345681')
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  phone = EXCLUDED.phone;

-- =====================================================
-- MENSAJE DE CONFIRMACIÓN
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '=== PERFILES DE USUARIOS DEMO CREADOS ===';
    RAISE NOTICE 'Admin: admin@demo.com / demo123';
    RAISE NOTICE 'Supervisor: supervisor@demo.com / demo123';
    RAISE NOTICE 'Jefe Cuadrilla: jefe@demo.com / demo123';
    RAISE NOTICE 'Maestro: maestro@demo.com / demo123';
    RAISE NOTICE '';
    RAISE NOTICE 'IMPORTANTE: Debes crear estos usuarios manualmente en Supabase Auth';
    RAISE NOTICE 'Ve a Authentication > Users y créalos con los emails y contraseña "demo123"';
    RAISE NOTICE 'Luego actualiza los IDs en este script con los UUIDs reales';
END $$;

-- =====================================================
-- INSTRUCCIONES PARA CREAR USUARIOS EN SUPABASE
-- =====================================================

/*
PASOS PARA CREAR USUARIOS DEMO:

1. Ve a tu proyecto Supabase
2. Authentication > Users
3. Haz clic en "Add user" 
4. Crea cada usuario con:
   - Email: admin@demo.com, supervisor@demo.com, etc.
   - Password: demo123
   - Email Confirm: true (marcado)

5. Una vez creados, copia los UUIDs generados
6. Actualiza este script reemplazando los UUIDs de ejemplo
7. Ejecuta este script actualizado

USUARIOS A CREAR:
- admin@demo.com (password: demo123)
- supervisor@demo.com (password: demo123)  
- jefe@demo.com (password: demo123)
- maestro@demo.com (password: demo123)
*/

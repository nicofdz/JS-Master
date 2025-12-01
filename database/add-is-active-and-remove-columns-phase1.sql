-- =====================================================
-- FASE 1: AGREGAR is_active Y ELIMINAR COLUMNAS REDUNDANTES
-- =====================================================
-- Esta migración:
-- 1. Agrega is_active a floors y apartments
-- 2. Elimina parking_spaces y finish_type de apartments
-- 3. Actualiza todos los registros existentes a is_active = true
-- =====================================================

-- =====================================================
-- 1. AGREGAR is_active A FLOORS
-- =====================================================
ALTER TABLE public.floors
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Actualizar todos los registros existentes a activos
UPDATE public.floors
SET is_active = TRUE
WHERE is_active IS NULL;

-- Hacer NOT NULL después de actualizar
ALTER TABLE public.floors
ALTER COLUMN is_active SET NOT NULL;

-- Agregar comentario
COMMENT ON COLUMN public.floors.is_active IS 'Indica si el piso está activo (TRUE) o eliminado (FALSE - soft delete)';

-- =====================================================
-- 2. AGREGAR is_active A APARTMENTS
-- =====================================================
ALTER TABLE public.apartments
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Actualizar todos los registros existentes a activos
UPDATE public.apartments
SET is_active = TRUE
WHERE is_active IS NULL;

-- Hacer NOT NULL después de actualizar
ALTER TABLE public.apartments
ALTER COLUMN is_active SET NOT NULL;

-- Agregar comentario
COMMENT ON COLUMN public.apartments.is_active IS 'Indica si el departamento está activo (TRUE) o eliminado (FALSE - soft delete)';

-- =====================================================
-- 3. ELIMINAR COLUMNAS REDUNDANTES DE APARTMENTS
-- =====================================================

-- Eliminar parking_spaces
ALTER TABLE public.apartments
DROP COLUMN IF EXISTS parking_spaces;

-- Eliminar finish_type
ALTER TABLE public.apartments
DROP COLUMN IF EXISTS finish_type;

-- =====================================================
-- 4. CREAR ÍNDICES PARA OPTIMIZAR CONSULTAS
-- =====================================================

-- Índice para filtrar pisos activos
CREATE INDEX IF NOT EXISTS idx_floors_is_active ON public.floors(is_active) WHERE is_active = TRUE;

-- Índice para filtrar departamentos activos
CREATE INDEX IF NOT EXISTS idx_apartments_is_active ON public.apartments(is_active) WHERE is_active = TRUE;

-- Índice compuesto para floors (tower_id + is_active)
CREATE INDEX IF NOT EXISTS idx_floors_tower_id_active ON public.floors(tower_id, is_active) WHERE is_active = TRUE;

-- Índice compuesto para apartments (floor_id + is_active)
CREATE INDEX IF NOT EXISTS idx_apartments_floor_id_active ON public.apartments(floor_id, is_active) WHERE is_active = TRUE;

-- =====================================================
-- 5. VERIFICACIÓN
-- =====================================================

-- Verificar que las columnas se agregaron correctamente
DO $$
BEGIN
    -- Verificar floors.is_active
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'floors' 
        AND column_name = 'is_active'
    ) THEN
        RAISE NOTICE '✅ Columna is_active agregada a floors';
    ELSE
        RAISE EXCEPTION '❌ Error: is_active no se agregó a floors';
    END IF;

    -- Verificar apartments.is_active
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'apartments' 
        AND column_name = 'is_active'
    ) THEN
        RAISE NOTICE '✅ Columna is_active agregada a apartments';
    ELSE
        RAISE EXCEPTION '❌ Error: is_active no se agregó a apartments';
    END IF;

    -- Verificar que parking_spaces fue eliminada
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'apartments' 
        AND column_name = 'parking_spaces'
    ) THEN
        RAISE NOTICE '✅ Columna parking_spaces eliminada de apartments';
    ELSE
        RAISE WARNING '⚠️ parking_spaces aún existe en apartments';
    END IF;

    -- Verificar que finish_type fue eliminada
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'apartments' 
        AND column_name = 'finish_type'
    ) THEN
        RAISE NOTICE '✅ Columna finish_type eliminada de apartments';
    ELSE
        RAISE WARNING '⚠️ finish_type aún existe en apartments';
    END IF;
END $$;

-- Mostrar estadísticas
SELECT 
    'Floors activos' as tabla,
    COUNT(*) FILTER (WHERE is_active = TRUE) as activos,
    COUNT(*) FILTER (WHERE is_active = FALSE) as eliminados,
    COUNT(*) as total
FROM public.floors
UNION ALL
SELECT 
    'Apartments activos' as tabla,
    COUNT(*) FILTER (WHERE is_active = TRUE) as activos,
    COUNT(*) FILTER (WHERE is_active = FALSE) as eliminados,
    COUNT(*) as total
FROM public.apartments;

RAISE NOTICE '🎉 FASE 1 COMPLETADA: is_active agregado y columnas redundantes eliminadas';


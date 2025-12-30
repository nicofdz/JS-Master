-- =====================================================
-- HABILITAR ACTUALIZACION EN material_movements
-- =====================================================
-- Permitir a usuarios autenticados actualizar registros en material_movements
-- Necesario para marcar entregas como "Usadas" (consumed = true)
-- =====================================================

-- Habilitar RLS si no está habilitado (aunque probablemente ya lo esté)
ALTER TABLE public.material_movements ENABLE ROW LEVEL SECURITY;

-- Crear política de actualización
-- Nota: Usamos IF NOT EXISTS para evitar errores si la política ya existe con otro nombre o si se re-ejecuta
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'material_movements' 
        AND policyname = 'Enable update for authenticated users'
    ) THEN
        CREATE POLICY "Enable update for authenticated users"
        ON public.material_movements
        FOR UPDATE
        USING (auth.role() = 'authenticated')
        WITH CHECK (auth.role() = 'authenticated');
    END IF;
END
$$;

-- Alternativamente, si queremos restringir solo a la columna consumed (no nativo en politicas, pero conceptualmente):
-- El USING (auth.role() = 'authenticated') es estándar para permitir a cualquier usuario logueado editar.
-- Si hay restricciones de proyecto, se deberían agregar en el USING (ej. exists check en user_projects)

-- =====================================================
-- CREAR TABLA DE COMENTARIOS DE TAREAS
-- =====================================================

-- Crear tabla para comentarios de tareas
CREATE TABLE IF NOT EXISTS task_comments (
    id SERIAL PRIMARY KEY,
    task_id INTEGER NOT NULL REFERENCES apartment_tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    comment_text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_user_id ON task_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_created_at ON task_comments(created_at);

-- Crear trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_task_comments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_task_comments_updated_at
    BEFORE UPDATE ON task_comments
    FOR EACH ROW
    EXECUTE FUNCTION update_task_comments_updated_at();

-- Habilitar RLS (Row Level Security)
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;

-- Crear políticas de RLS
-- Los usuarios pueden ver todos los comentarios
CREATE POLICY "Users can view all task comments" ON task_comments
    FOR SELECT USING (true);

-- Los usuarios autenticados pueden insertar comentarios
CREATE POLICY "Authenticated users can insert task comments" ON task_comments
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Los usuarios pueden actualizar sus propios comentarios
CREATE POLICY "Users can update their own task comments" ON task_comments
    FOR UPDATE USING (auth.uid() = user_id);

-- Los usuarios pueden eliminar sus propios comentarios
CREATE POLICY "Users can delete their own task comments" ON task_comments
    FOR DELETE USING (auth.uid() = user_id);

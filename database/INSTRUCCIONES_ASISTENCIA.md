# 📋 Instrucciones para Crear la Tabla de Asistencia

## Pasos para ejecutar el script

1. **Abre Supabase**
   - Ve a tu proyecto en [supabase.com](https://supabase.com)

2. **Abre el SQL Editor**
   - En el menú lateral, haz clic en "SQL Editor"

3. **Ejecuta el script**
   - Abre el archivo `database/create-worker-attendance.sql`
   - Copia todo el contenido
   - Pégalo en el SQL Editor de Supabase
   - Haz clic en "Run" o presiona `Ctrl + Enter`

4. **Verifica la creación**
   - Ve a "Table Editor" en el menú lateral
   - Deberías ver la nueva tabla `worker_attendance`

## ¿Qué hace este script?

- ✅ Crea la tabla `worker_attendance` para registrar asistencias
- ✅ Registra fecha, hora, trabajador y proyecto
- ✅ Permite agregar notas (ej: "llegó tarde", "permiso médico")
- ✅ Evita duplicados (un trabajador solo puede tener un registro por día/proyecto)
- ✅ Configura las políticas de seguridad (RLS)

## Estructura de la tabla

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | SERIAL | ID único |
| `worker_id` | INTEGER | ID del trabajador |
| `project_id` | INTEGER | ID del proyecto (opcional) |
| `attendance_date` | DATE | Fecha de asistencia |
| `is_present` | BOOLEAN | Si estuvo presente |
| `check_in_time` | TIMESTAMP | Hora de registro |
| `notes` | TEXT | Notas o justificaciones |

---

**¡Listo para usar!** 🚀




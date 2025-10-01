# Instrucciones: Agregar columna previous_status a apartments

## ⚠️ IMPORTANTE: Debes ejecutar este script SQL

Para que funcione correctamente el bloqueo/desbloqueo de apartamentos con restauración del estado previo, debes ejecutar el siguiente script SQL en Supabase.

## Pasos a seguir:

1. **Ir a Supabase Dashboard**
   - Abre tu proyecto en https://supabase.com/dashboard

2. **Abrir SQL Editor**
   - En el menú lateral izquierdo, haz clic en "SQL Editor"

3. **Crear nueva query**
   - Haz clic en "+ New query"

4. **Copiar y pegar el script**
   - Abre el archivo: `database/add-previous-status-to-apartments.sql`
   - Copia todo su contenido
   - Pégalo en el editor SQL

5. **Ejecutar el script**
   - Haz clic en el botón "Run" (▶️) o presiona Ctrl+Enter

6. **Verificar resultado**
   - Deberías ver un mensaje: "Columna previous_status agregada exitosamente"
   - Y una tabla mostrando la nueva columna

## ¿Qué hace este script?

- Agrega la columna `previous_status` a la tabla `apartments`
- Esta columna guarda el estado anterior del apartamento antes de bloquearlo
- Al desbloquear, el sistema restaura automáticamente el estado previo

## Problemas solucionados:

✅ **Error 400 al bloquear apartamentos** - Eliminado el conflicto entre bloqueo manual y recálculo automático de estado

✅ **Estado incorrecto al desbloquear** - Ahora se restaura el estado anterior (ej: 'completed') en lugar de siempre volver a 'pending'

## Verificación:

Después de ejecutar el script, puedes verificar que todo funciona:

1. Ve a la vista de Pisos
2. Expande un piso con apartamentos
3. Bloquea un apartamento que esté en estado "Completado"
4. Desbloquéalo de nuevo
5. ✅ Debería volver a estado "Completado" (no a "Pendiente")


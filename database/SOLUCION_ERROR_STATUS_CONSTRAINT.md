# 🔧 Solución al Error: apartment_tasks_status_check

## ❌ **Problema Identificado:**
```
Error Supabase: new row for relation "apartment_tasks" violates check constraint "apartment_tasks_status_check"
```

## 🎯 **Causa del Error:**
La tabla `apartment_tasks` tiene una restricción de verificación (check constraint) en la columna `status` que solo permite ciertos valores, y el valor que se está intentando insertar/actualizar no está permitido.

## ✅ **Solución Paso a Paso:**

### **Paso 1: Verificar la Restricción Actual**
```sql
-- Ejecutar: database/check-apartment-tasks-constraints.sql
```

### **Paso 2: Corregir la Restricción**
```sql
-- Ejecutar: database/fix-apartment-tasks-status-constraint.sql
```

## 🎯 **Archivos de Solución:**

### **`database/check-apartment-tasks-constraints.sql`**
- ✅ Verifica las restricciones existentes
- ✅ Muestra los valores actuales de status
- ✅ Identifica el problema específico

### **`database/fix-apartment-tasks-status-constraint.sql`**
- ✅ Elimina la restricción problemática
- ✅ Crea una nueva restricción más flexible
- ✅ Permite los valores: 'pending', 'in_progress', 'completed', 'cancelled', 'on_hold'

## 🚀 **Instrucciones de Ejecución:**

1. **Primero:** Ejecutar `database/check-apartment-tasks-constraints.sql`
2. **Segundo:** Ejecutar `database/fix-apartment-tasks-status-constraint.sql`
3. **Tercero:** Probar editar una tarea en la interfaz

## ✅ **Valores de Status Permitidos:**

- ✅ `pending` - Pendiente
- ✅ `in_progress` - En Progreso  
- ✅ `completed` - Completada
- ✅ `cancelled` - Cancelada
- ✅ `on_hold` - En Espera

## 🔍 **Verificación:**
Después de ejecutar los archivos, verifica que:
- No aparezcan errores de restricción al editar tareas
- Los cambios de status funcionen correctamente
- La interfaz de tareas funcione sin errores
- Se puedan crear y actualizar tareas normalmente

## 📋 **Nota Importante:**
Si el error persiste, puede ser que el valor de status que se está enviando no coincida con los valores permitidos. En ese caso, verifica que el frontend esté enviando uno de los valores permitidos.









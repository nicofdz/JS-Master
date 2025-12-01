# 🔧 Solución Segura al Error: apartment_tasks_status_check

## ❌ **Problema Identificado:**
```
ERROR: 23514: check constraint "apartment_tasks_status_check" of relation "apartment_tasks" is violated by some row
```

## 🎯 **Causa del Error:**
Ya existen filas en la tabla `apartment_tasks` con valores de `status` que no coinciden con los valores permitidos por la nueva restricción.

## ✅ **Solución Segura Paso a Paso:**

### **Opción 1: Solución Segura (Recomendada)**
```sql
-- Ejecutar: database/safe-fix-status-constraint.sql
```

### **Opción 2: Solución Rápida**
```sql
-- Ejecutar: database/fix-apartment-tasks-status-constraint.sql
```

## 🎯 **Archivos de Solución:**

### **`database/safe-fix-status-constraint.sql` (Recomendado)**
- ✅ **Verifica valores problemáticos** antes de hacer cambios
- ✅ **Mapea valores en español** a valores en inglés
- ✅ **Actualiza solo los valores problemáticos**
- ✅ **Verifica que no queden valores problemáticos**
- ✅ **Crea la restricción solo después de limpiar los datos**

### **`database/fix-apartment-tasks-status-constraint.sql` (Alternativo)**
- ✅ **Actualiza todos los valores problemáticos** a 'pending'
- ✅ **Crea la restricción después de la limpieza**

## 🚀 **Instrucciones de Ejecución:**

### **Recomendado:**
1. **Ejecutar:** `database/safe-fix-status-constraint.sql`
2. **Verificar:** Que no aparezcan errores
3. **Probar:** Editar una tarea en la interfaz

### **Alternativo:**
1. **Ejecutar:** `database/fix-apartment-tasks-status-constraint.sql`
2. **Verificar:** Que no aparezcan errores
3. **Probar:** Editar una tarea en la interfaz

## ✅ **Mapeo de Valores (Solución Segura):**

- ✅ `Pendiente` → `pending`
- ✅ `En Progreso` → `in_progress`
- ✅ `Completada` → `completed`
- ✅ `Cancelada` → `cancelled`
- ✅ `En Espera` → `on_hold`
- ✅ `Finalizada` → `completed`
- ✅ `Terminada` → `completed`
- ✅ `Activa` → `in_progress`
- ✅ `Inactiva` → `cancelled`
- ✅ **Otros valores** → `pending`

## 🔍 **Verificación:**
Después de ejecutar el archivo, verifica que:
- No aparezcan errores de restricción
- Los valores de status se hayan mapeado correctamente
- Se pueda editar tareas sin errores
- La interfaz funcione normalmente

## 📋 **Nota Importante:**
La solución segura preserva el significado de los valores existentes, mientras que la solución rápida convierte todos los valores problemáticos a 'pending'.
















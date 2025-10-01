# 🔧 Corrección de Constantes de Status

## ❌ **Problema Identificado:**
```
Error Supabase: new row for relation "apartment_tasks" violates check constraint "apartment_tasks_status_check"
```

## 🎯 **Causa del Error:**
Las constantes en el frontend no coincidían con los valores permitidos por la restricción de la base de datos.

## ✅ **Corrección Aplicada:**

### **Archivo Corregido:**
- **`src/lib/constants.ts`**

### **Cambios Realizados:**

#### **ACTIVITY_STATUSES (antes):**
```typescript
{
  pending: 'Pendiente',
  'in_progress': 'En Progreso',  // ❌ Problema: comillas
  completed: 'Completado',
  blocked: 'Bloqueado'          // ❌ No permitido en BD
}
```

#### **ACTIVITY_STATUSES (después):**
```typescript
{
  pending: 'Pendiente',
  in_progress: 'En Progreso',   // ✅ Corregido: sin comillas
  completed: 'Completado',
  cancelled: 'Cancelado',       // ✅ Agregado: permitido en BD
  on_hold: 'En Espera'          // ✅ Agregado: permitido en BD
}
```

#### **ACTIVITY_STATUS (antes):**
```typescript
{
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  BLOCKED: 'blocked'            // ❌ No permitido en BD
}
```

#### **ACTIVITY_STATUS (después):**
```typescript
{
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',       // ✅ Agregado: permitido en BD
  ON_HOLD: 'on_hold'            // ✅ Agregado: permitido en BD
}
```

## ✅ **Valores Permitidos en la Base de Datos:**

- ✅ `pending` - Pendiente
- ✅ `in_progress` - En Progreso
- ✅ `completed` - Completado
- ✅ `cancelled` - Cancelado
- ✅ `on_hold` - En Espera

## 🎯 **Resultado Final:**

- ✅ **No más errores de restricción** al crear/editar tareas
- ✅ **Los valores del formulario coinciden** con la base de datos
- ✅ **Se pueden usar todos los estados** permitidos
- ✅ **La interfaz de tareas funcionará** sin errores

## 🔍 **Verificación:**
- ✅ No aparecen errores de restricción al crear tareas
- ✅ No aparecen errores de restricción al editar tareas
- ✅ Todos los estados del formulario funcionan
- ✅ La interfaz de tareas funciona normalmente











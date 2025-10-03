# 🔧 Corrección de Status en TaskCard

## ❌ **Problema Identificado:**
```
Error Supabase: new row for relation "apartment_tasks" violates check constraint "apartment_tasks_status_check"
```

## 🎯 **Causa del Error:**
El componente `TaskCard` estaba enviando `'in-progress'` (con guión) pero la base de datos espera `'in_progress'` (con guión bajo).

## ✅ **Corrección Aplicada:**

### **Archivo Corregido:**
- **`src/components/tasks/TaskCard.tsx`**

### **Cambios Realizados:**

#### **1. Función getStatusIcon:**
```typescript
// Antes:
case 'in-progress': return <Play className="w-5 h-5 text-blue-600" />

// Después:
case 'in_progress': return <Play className="w-5 h-5 text-blue-600" />
```

#### **2. Mensaje de Toast:**
```typescript
// Antes:
newStatus === 'in-progress' ? 'iniciada' : 'bloqueada'

// Después:
newStatus === 'in_progress' ? 'iniciada' : 'bloqueada'
```

#### **3. Botones de Acción:**
```typescript
// Antes:
onClick={() => handleStatusChange('in-progress')}

// Después:
onClick={() => handleStatusChange('in_progress')}
```

#### **4. Switch Case:**
```typescript
// Antes:
case 'in-progress':

// Después:
case 'in_progress':
```

#### **5. Condiciones de Estilo:**
```typescript
// Antes:
task.status === 'in-progress' ? 'bg-blue-50 border-blue-200' :

// Después:
task.status === 'in_progress' ? 'bg-blue-50 border-blue-200' :
```

#### **6. Condiciones de Display:**
```typescript
// Antes:
{task.status === 'in-progress' || task.status === 'in_progress' ? (

// Después:
{task.status === 'in_progress' ? (
```

## ✅ **Valores Correctos en la Base de Datos:**

- ✅ `pending` - Pendiente
- ✅ `in_progress` - En Progreso (con guión bajo)
- ✅ `completed` - Completado
- ✅ `cancelled` - Cancelado
- ✅ `on_hold` - En Espera

## 🎯 **Resultado Final:**

- ✅ **No más errores de restricción** al cambiar status de tareas
- ✅ **Los botones de acción funcionan** correctamente
- ✅ **Los estilos se aplican** correctamente
- ✅ **La interfaz de tareas funciona** sin errores

## 🔍 **Verificación:**
- ✅ No aparecen errores de restricción al cambiar status
- ✅ Los botones "Iniciar", "Completar", "Bloquear" funcionan
- ✅ Los estilos visuales se aplican correctamente
- ✅ La interfaz de tareas funciona normalmente
















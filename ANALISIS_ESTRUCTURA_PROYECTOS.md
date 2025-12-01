# Análisis: Sistema de Estructura y Edición de Proyectos

## 📋 Resumen General

El sistema de estructura de proyectos permite gestionar la jerarquía completa de un proyecto de construcción:
**Proyecto → Torres → Pisos → Apartamentos → Tareas**

Todo se gestiona desde el modal `EditStructureModal`, que es el componente central de edición.

---

## 🏗️ Arquitectura del Sistema

### Jerarquía de Datos

```
Proyecto (projects)
  └── Torre (towers)
       └── Piso (floors)
            └── Apartamento (apartments)
                 └── Tarea (apartment_tasks)
```

### Componentes Principales

1. **`EditStructureModal`** - Componente principal que muestra y gestiona toda la estructura
2. **`AddTowerModal`** - Crear nuevas torres
3. **`EditTowerModal`** - Editar nombre de torre
4. **`AddFloorModal`** - Crear pisos (individual o múltiple)
5. **`AddApartmentsModal`** - Crear apartamentos en un piso específico
6. **`AddApartmentsToAllFloorsModal`** - Crear apartamentos en todos los pisos de una torre
7. **`EditApartmentModal`** - Editar datos de un apartamento
8. **`AddTasksToFloorsModal`** - Agregar tareas a pisos
9. **`ApartmentTasksModal`** - Ver/editar tareas de un apartamento

### Hooks Utilizados

- **`useTowers(projectId)`** - Gestión de torres
- **`useFloors(projectId)`** - Gestión de pisos
- **`useApartments(floorId?)`** - Gestión de apartamentos

---

## 🔄 Flujo de Funcionamiento

### 1. Acceso al Modal de Edición

**Ubicación**: `src/app/(auth)/proyectos/page.tsx`

```typescript
// Al hacer clic en "Editar Estructura" en un proyecto
setSelectedProjectForEditStructure(project)
setShowEditStructureModal(true)
```

**Componente**: `EditStructureModal`

### 2. Carga de Datos

Cuando se abre el modal, se cargan automáticamente:

```typescript
const { towers } = useTowers(projectId)        // Todas las torres del proyecto
const { floors } = useFloors(projectId)        // Todos los pisos del proyecto
const { apartments } = useApartments()         // Todos los apartamentos (luego se filtran)
```

**Filtrado**:
- Los pisos se filtran por `project_id`
- Los apartamentos se filtran verificando que su `floor_id` pertenezca a un piso del proyecto

### 3. Agrupación de Datos

El componente agrupa los datos para mostrarlos jerárquicamente:

```typescript
// Agrupar pisos por torre
const floorsByTower = projectFloors.reduce((acc, floor) => {
  const towerId = floor.tower_id
  if (towerId && !acc[towerId]) {
    acc[towerId] = []
  }
  if (towerId) {
    acc[towerId].push(floor)
  }
  return acc
}, {} as Record<number, typeof projectFloors>)

// Agrupar departamentos por piso
const apartmentsByFloor = projectApartments.reduce((acc, apartment) => {
  if (!acc[apartment.floor_id]) {
    acc[apartment.floor_id] = []
  }
  acc[apartment.floor_id].push(apartment)
  return acc
}, {} as Record<number, typeof projectApartments>)
```

### 4. Visualización Jerárquica

La estructura se muestra como un árbol expandible:

```
📦 Torre 1 (expandible)
   ├── 📊 Piso 1 (expandible)
   │    ├── 🏠 101 [2/5 tareas]
   │    ├── 🏠 102 [3/3 tareas] ✅
   │    └── 🏠 103 [0/0 tareas]
   └── 📊 Piso 2 (expandible)
        └── 🏠 201 [1/4 tareas]
```

---

## 🎯 Funcionalidades por Nivel

### Nivel 1: TORRES

#### Crear Torre
**Modal**: `AddTowerModal`
**Hook**: `useTowers.createTower()`
**Proceso**:
1. Calcula automáticamente el siguiente `tower_number` usando `getNextTowerNumber()`
2. Permite agregar un nombre opcional (ej: "Torre Norte")
3. Crea la torre con `is_active = true`

**Código**:
```typescript
const handleAddTower = () => {
  setShowAddTowerModal(true)
}
```

#### Editar Torre
**Modal**: `EditTowerModal`
**Hook**: `useTowers.updateTower()`
**Proceso**:
- Solo permite editar el nombre de la torre
- El `tower_number` no se puede cambiar

#### Eliminar Torre
**Función**: `handleDeleteTower()`
**Hook**: `useTowers.softDeleteTower()`
**Proceso**:
1. Muestra confirmación (elimina pisos y apartamentos también)
2. Marca la torre como `is_active = false`
3. Agrega prefijo `[ELIMINADO]` al nombre
4. Refresca todos los datos

**⚠️ IMPORTANTE**: La eliminación es en cascada (soft delete):
- Torre → `is_active = false`
- Los pisos y apartamentos NO se eliminan automáticamente
- Pero no se pueden crear nuevos pisos en una torre eliminada (validación en BD)

### Nivel 2: PISOS

#### Crear Piso Individual
**Modal**: `AddFloorModal` (modo `single`)
**Hook**: `useFloors.createFloor()`
**Proceso**:
1. Calcula automáticamente el siguiente `floor_number` usando `getNextFloorNumber(towerId, type)`
2. Soporta dos tipos:
   - **Normal**: Pisos positivos (1, 2, 3...)
   - **Subterráneo**: Pisos negativos (-1, -2, -3...)
3. Crea el piso con `status = 'in-progress'`

#### Crear Múltiples Pisos
**Modal**: `AddFloorModal` (modo `multiple`)
**Proceso**:
1. Calcula el número de inicio automáticamente
2. Permite especificar cantidad (1-100)
3. Crea todos los pisos en una operación batch:
   ```typescript
   const floorsToCreate = []
   for (let i = 0; i < quantity; i++) {
     const floorNumber = floorType === 'subterranean' 
       ? nextNumber - i  // -1, -2, -3...
       : nextNumber + i  // 1, 2, 3...
     floorsToCreate.push({...})
   }
   await supabase.from('floors').insert(floorsToCreate)
   ```

**Características**:
- El número de inicio está bloqueado (no editable)
- Se calcula automáticamente según el tipo
- Muestra preview de los números que se crearán

#### Eliminar Piso
**Función**: `handleDeleteFloor()`
**Hook**: `useFloors.softDeleteFloor()`
**Proceso**:
1. Muestra confirmación
2. Hace soft delete de todos los apartamentos del piso:
   - Marca `is_active = false`
   - Agrega prefijo `[ELIMINADO]` al `apartment_number`
3. Marca el piso como `is_active = false`
4. Refresca datos

### Nivel 3: APARTAMENTOS

#### Crear Apartamentos en un Piso
**Modal**: `AddApartmentsModal`
**Hook**: `useApartments.createApartment()`
**Proceso**:
1. Calcula el siguiente número usando `getNextApartmentNumber(floorId)`
2. Permite crear múltiples apartamentos en una tabla:
   - Agregar filas individualmente
   - Agregar cantidad personalizada (genera filas automáticamente)
3. Cada fila tiene:
   - `apartment_number` (sugerido automáticamente)
   - `apartment_type` (opcional)
   - `area` (opcional)
   - `bedrooms` (opcional)
   - `bathrooms` (opcional)
4. Crea todos los apartamentos en batch

**Características**:
- Los números se sugieren automáticamente
- Si hay códigos complejos (ej: "F3X D-101"), extrae el número y continúa la secuencia
- Permite editar cada número antes de crear

#### Crear Apartamentos en Todos los Pisos de una Torre
**Modal**: `AddApartmentsToAllFloorsModal`
**Proceso**:
1. Pide cantidad de apartamentos por piso
2. Pide datos comunes (tipo, área, dormitorios, baños)
3. Para cada piso de la torre:
   - Obtiene el siguiente número disponible
   - Genera números con prefijo del piso (ej: 101, 201, S101 para subterráneos)
   - Continúa la secuencia desde el último apartamento existente
4. Crea todos los apartamentos en batch

**Lógica de Numeración**:
```typescript
// Para piso 1: 101, 102, 103...
// Para piso 2: 201, 202, 203...
// Para piso -1 (subterráneo): S101, S102, S103...
```

#### Editar Apartamento
**Modal**: `EditApartmentModal`
**Hook**: `useApartments.updateApartment()`
**Proceso**:
- Permite editar:
  - `apartment_number`
  - `apartment_type`
  - `area`
  - `bedrooms`
  - `bathrooms`

#### Eliminar Apartamento
**Función**: `handleDeleteApartment()`
**Hook**: `useApartments.softDeleteApartment()`
**Proceso**:
1. Muestra confirmación
2. Marca `is_active = false`
3. Agrega prefijo `[ELIMINADO]` al `apartment_number`
4. Refresca datos y conteo de tareas

### Nivel 4: TAREAS

#### Ver Tareas de un Apartamento
**Modal**: `ApartmentTasksModal`
**Acceso**: Click en el botón del apartamento
**Proceso**:
- Muestra todas las tareas del apartamento
- Permite crear, editar y eliminar tareas

#### Agregar Tareas a un Piso
**Modal**: `AddTasksToFloorsModal`
**Proceso**:
- Permite agregar tareas a todos los apartamentos de un piso
- Usa plantillas de tareas (`task_templates`)
- Crea tareas en batch para todos los apartamentos

---

## 🔍 Características Especiales

### 1. Conteo de Tareas en Tiempo Real

El modal carga y muestra el progreso de tareas de cada apartamento:

```typescript
const fetchTaskCounts = async () => {
  const apartmentIds = projectApartments.map(a => a.id)
  const { data } = await supabase
    .from('apartment_tasks')
    .select('apartment_id, status')
    .in('apartment_id', apartmentIds)
  
  // Agrupa por apartamento y cuenta completadas/total
  const counts: Record<number, { completed: number; total: number }> = {}
  data?.forEach(task => {
    if (!counts[task.apartment_id]) {
      counts[task.apartment_id] = { completed: 0, total: 0 }
    }
    counts[task.apartment_id].total++
    if (task.status === 'completed') {
      counts[task.apartment_id].completed++
    }
  })
}
```

**Visualización**: Badge en cada apartamento mostrando `completadas/total`

### 2. Ordenamiento Inteligente

Los apartamentos se ordenan extrayendo números de códigos complejos:

```typescript
const extractNumber = (apartmentNumber: string): number => {
  const match = apartmentNumber.match(/[-\s](\d+)/)
  if (match && match[1]) {
    return parseInt(match[1], 10)
  }
  const anyNumber = apartmentNumber.match(/(\d+)/)
  return anyNumber ? parseInt(anyNumber[1], 10) : 0
}
```

Esto permite ordenar correctamente códigos como:
- "101" → 101
- "F3X D-102" → 102
- "A1 D-103" → 103

### 3. Estados Expandibles

El modal usa `Set` para manejar qué elementos están expandidos:

```typescript
const [expandedTowers, setExpandedTowers] = useState<Set<number>>(new Set())
const [expandedFloors, setExpandedFloors] = useState<Set<number>>(new Set())

const toggleTower = (towerId: number) => {
  setExpandedTowers(prev => {
    const newSet = new Set(prev)
    if (newSet.has(towerId)) {
      newSet.delete(towerId)
    } else {
      newSet.add(towerId)
    }
    return newSet
  })
}
```

### 4. Botones de Acción Contextuales

Los botones de acción aparecen al hacer hover sobre cada elemento:

- **Torre**: Agregar Departamentos (todos los pisos), Agregar Piso, Editar, Eliminar
- **Piso**: Agregar Departamentos, Agregar Tareas, Eliminar
- **Apartamento**: Editar, Eliminar, Ver Tareas (click en el botón)

### 5. Refresh Automático

Después de cualquier operación (crear, editar, eliminar), se refrescan todos los datos:

```typescript
const handleRefresh = () => {
  refreshTowers()
  refreshFloors()
  refreshApartments()
  fetchTaskCounts()
}
```

---

## 🔐 Validaciones y Restricciones

### A Nivel de Base de Datos

1. **Unicidad de `floor_number` por torre**: No puede haber dos pisos con el mismo número en la misma torre
2. **Relaciones activas**: No se pueden crear apartamentos en pisos eliminados
3. **Relaciones activas**: No se pueden crear pisos en torres eliminadas

### A Nivel de Frontend

1. **Confirmaciones**: Todas las eliminaciones requieren confirmación
2. **Validación de números**: Los números se calculan automáticamente para evitar duplicados
3. **Filtrado**: Solo se muestran elementos activos (`is_active = true`)

---

## 📊 Flujo de Datos

```
Usuario hace acción
  ↓
Modal se abre / Función se ejecuta
  ↓
Hook realiza operación en Supabase
  ↓
Supabase actualiza BD
  ↓
Hook actualiza estado local
  ↓
Componente se re-renderiza
  ↓
handleRefresh() actualiza todos los datos
  ↓
UI se actualiza con nuevos datos
```

---

## 🎨 Interfaz de Usuario

### Estructura Visual

```
┌─────────────────────────────────────────┐
│  Editar Estructura: [Nombre Proyecto]   │
├─────────────────────────────────────────┤
│  [Agregar Torre]  [Actualizar]          │
├─────────────────────────────────────────┤
│  ▼ Torre 1 (2 pisos)                    │
│    [Departamentos] [Piso] [Editar] [🗑️] │
│    ├─ ▼ Piso 1 (3 departamentos)        │
│    │   [Departamentos] [Tareas] [🗑️]   │
│    │   ├─ [101] [2/5] [Editar] [🗑️]   │
│    │   ├─ [102] [3/3] ✅ [Editar] [🗑️] │
│    │   └─ [103] [0/0] [Editar] [🗑️]   │
│    └─ ▶ Piso 2 (1 departamento)         │
└─────────────────────────────────────────┘
```

### Estados Visuales

- **Badge de tareas**: 
  - Verde (`bg-green-500`) si todas completadas
  - Amarillo (`bg-yellow-500`) si hay pendientes
- **Expandido/Colapsado**: Iconos `ChevronDown` / `ChevronRight`
- **Hover**: Botones de acción aparecen con `opacity-0 group-hover:opacity-100`

---

## 🚀 Optimizaciones Implementadas

1. **Batch Inserts**: Creación múltiple de pisos/apartamentos en una sola operación
2. **Cálculo Automático**: Números sugeridos automáticamente para evitar errores
3. **Filtrado Eficiente**: Solo carga datos del proyecto actual
4. **Actualización Selectiva**: Solo refresca lo necesario después de operaciones

---

## 🔧 Puntos de Mejora Potenciales

1. **Carga Lazy**: Cargar apartamentos solo cuando se expande un piso
2. **Paginación**: Si hay muchos apartamentos, paginar la visualización
3. **Búsqueda**: Agregar búsqueda dentro del modal
4. **Drag & Drop**: Reordenar pisos/apartamentos arrastrando
5. **Undo/Redo**: Sistema de deshacer para eliminaciones

---

## 📝 Resumen de Funciones Principales

| Función | Componente | Hook | Descripción |
|---------|-----------|------|-------------|
| `handleAddTower` | EditStructureModal | useTowers | Abre modal para crear torre |
| `handleAddFloor` | EditStructureModal | useFloors | Abre modal para crear piso(s) |
| `handleAddApartments` | EditStructureModal | useApartments | Abre modal para crear apartamentos en un piso |
| `handleAddApartmentsToAllFloors` | EditStructureModal | useApartments | Abre modal para crear apartamentos en todos los pisos |
| `handleDeleteTower` | EditStructureModal | useTowers.softDeleteTower | Elimina torre (soft delete) |
| `handleDeleteFloor` | EditStructureModal | useFloors.softDeleteFloor | Elimina piso y sus apartamentos |
| `handleDeleteApartment` | EditStructureModal | useApartments.softDeleteApartment | Elimina apartamento |
| `handleRefresh` | EditStructureModal | Todos | Refresca todos los datos |
| `fetchTaskCounts` | EditStructureModal | Supabase directo | Carga conteo de tareas por apartamento |

---

## ✅ Conclusión

El sistema de estructura de proyectos es un componente complejo pero bien organizado que permite gestionar toda la jerarquía de un proyecto de construcción de forma intuitiva y eficiente. Utiliza soft delete para mantener integridad de datos, batch operations para eficiencia, y una interfaz jerárquica clara para facilitar la navegación.


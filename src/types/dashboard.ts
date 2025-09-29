// Tipos unificados para el dashboard que funcionan con datos mock y reales

export interface UnifiedProject {
  id: number
  name: string
  address: string | null
  totalFloors: number | null
  unitsPerFloor: number | null
  status: string
  globalProgress: number
  estimatedCompletion: string
  currentFloor?: number
  // Campos específicos de datos reales
  total_floors?: number | null
  units_per_floor?: number | null
  progress_percentage?: number | null
}

export interface UnifiedFloor {
  id: number
  floorNumber: number
  status: string
  progress: number
  activeTeams: number
  estimatedCompletion: string
  delayDays: number
  projectId?: number
  // Campos específicos de datos reales
  floor_number?: number
  project_name?: string
  progress_percentage?: number
  apartments_count?: number
}

// Funciones helper para normalizar datos
export function normalizeProject(project: any, isRealData: boolean): UnifiedProject {
  if (isRealData) {
    return {
      id: project.id,
      name: project.name,
      address: project.address,
      totalFloors: project.total_floors,
      unitsPerFloor: project.units_per_floor,
      status: project.status,
      globalProgress: project.progress_percentage || 0,
      estimatedCompletion: '2024-12-31', // Default para datos reales
      currentFloor: Math.ceil((project.total_floors || 1) * ((project.progress_percentage || 0) / 100))
    }
  } else {
    return {
      id: project.id,
      name: project.name,
      address: project.address,
      totalFloors: project.totalFloors,
      unitsPerFloor: project.unitsPerFloor,
      status: project.status,
      globalProgress: project.globalProgress,
      estimatedCompletion: project.estimatedCompletion,
      currentFloor: project.currentFloor
    }
  }
}

export function normalizeFloor(floor: any, isRealData: boolean, mockProjects?: any[]): UnifiedFloor {
  if (isRealData) {
    return {
      id: floor.id,
      floorNumber: floor.floor_number,
      status: floor.status,
      progress: floor.progress_percentage || 0,
      activeTeams: Math.ceil((floor.apartments_count || 0) / 2),
      estimatedCompletion: '2024-12-31', // Default para datos reales
      delayDays: 0 // Default para datos reales
    }
  } else {
    return {
      id: floor.id,
      floorNumber: floor.floorNumber,
      status: floor.status,
      progress: floor.progress,
      activeTeams: floor.activeTeams,
      estimatedCompletion: floor.estimatedCompletion,
      delayDays: floor.delayDays,
      projectId: floor.projectId
    }
  }
}


'use client'

import { createContext, useContext, useState, useEffect } from 'react'

interface ProjectFilterContextType {
  selectedProjectId: string | null
  setSelectedProjectId: (projectId: string | null) => void
  clearProjectFilter: () => void
}

const ProjectFilterContext = createContext<ProjectFilterContextType | undefined>(undefined)

export function ProjectFilterProvider({ children }: { children: React.ReactNode }) {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)

  // Cargar filtro desde localStorage al inicializar
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('selectedProjectId')
      if (saved && saved !== 'null') {
        setSelectedProjectId(saved)
      }
    }
  }, [])

  // Guardar filtro en localStorage cuando cambie
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (selectedProjectId) {
        localStorage.setItem('selectedProjectId', selectedProjectId)
      } else {
        localStorage.removeItem('selectedProjectId')
      }
    }
  }, [selectedProjectId])

  const clearProjectFilter = () => {
    setSelectedProjectId(null)
  }

  return (
    <ProjectFilterContext.Provider value={{
      selectedProjectId,
      setSelectedProjectId,
      clearProjectFilter
    }}>
      {children}
    </ProjectFilterContext.Provider>
  )
}

export function useProjectFilter() {
  const context = useContext(ProjectFilterContext)
  if (context === undefined) {
    throw new Error('useProjectFilter must be used within a ProjectFilterProvider')
  }
  return context
}

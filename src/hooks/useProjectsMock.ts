'use client'

import { useState, useEffect } from 'react'
import { mockProjects } from '@/data/mockData'
import type { Project } from '@/data/mockData'

interface ProjectFormData {
  name: string
  description?: string
  location: string
  start_date: string
  end_date?: string
  status: string
  budget?: number
}

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Simular carga inicial
  useEffect(() => {
    const loadProjects = () => {
      setLoading(true)
      // Simular delay de red
      setTimeout(() => {
        setProjects(mockProjects)
        setLoading(false)
      }, 500)
    }
    
    loadProjects()
  }, [])

  const createProject = async (projectData: ProjectFormData): Promise<Project> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const newProject: Project = {
          id: Math.max(...projects.map(p => p.id), 0) + 1,
          name: projectData.name,
          description: projectData.description || null,
          location: projectData.location,
          start_date: projectData.start_date,
          end_date: projectData.end_date || null,
          status: projectData.status,
          progress: 0,
          budget: projectData.budget || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
        
        setProjects(prev => [newProject, ...prev])
        resolve(newProject)
      }, 300)
    })
  }

  const updateProject = async (id: number, updates: Partial<ProjectFormData>): Promise<Project> => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const projectIndex = projects.findIndex(p => p.id === id)
        if (projectIndex === -1) {
          reject(new Error('Proyecto no encontrado'))
          return
        }

        const updatedProject: Project = {
          ...projects[projectIndex],
          ...updates,
          updated_at: new Date().toISOString()
        }

        setProjects(prev => prev.map(p => p.id === id ? updatedProject : p))
        resolve(updatedProject)
      }, 300)
    })
  }

  const deleteProject = async (id: number): Promise<void> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        setProjects(prev => prev.filter(p => p.id !== id))
        resolve()
      }, 300)
    })
  }

  const refresh = () => {
    setLoading(true)
    setTimeout(() => {
      setProjects([...mockProjects])
      setLoading(false)
    }, 500)
  }

  return {
    projects,
    loading,
    error,
    refresh,
    createProject,
    updateProject,
    deleteProject
  }
}

'use client'

import { useProjects } from './useProjects'

export function useProjectProgress() {
  const { updateProjectProgress } = useProjects()

  const updateProgressForProject = async (projectId: number) => {
    try {
      await updateProjectProgress(projectId)
    } catch (error) {
      console.error('Error updating project progress:', error)
    }
  }

  return {
    updateProgressForProject
  }
}


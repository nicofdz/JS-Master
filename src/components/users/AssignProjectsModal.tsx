
import React, { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Search, Briefcase } from 'lucide-react'
import { useProjects, Project } from '@/hooks/useProjects'
import { UserProfile } from '@/types/auth'

interface AssignProjectsModalProps {
    isOpen: boolean
    onClose: () => void
    user: UserProfile | null
    onSave: (userId: string, projectIds: number[]) => Promise<void>
    initialAssignments?: number[]
}

export const AssignProjectsModal: React.FC<AssignProjectsModalProps> = ({
    isOpen,
    onClose,
    user,
    onSave,
    initialAssignments = []
}) => {
    const { projects, loading: projectsLoading } = useProjects()
    const [selectedProjectIds, setSelectedProjectIds] = useState<number[]>([])
    const [searchTerm, setSearchTerm] = useState('')
    const [saving, setSaving] = useState(false)

    // Inicializar selección cuando se abre el modal o cambian las asignaciones iniciales
    useEffect(() => {
        if (isOpen) {
            setSelectedProjectIds(initialAssignments)
            setSearchTerm('')
        }
    }, [isOpen, initialAssignments])

    const handleToggleProject = (projectId: number) => {
        setSelectedProjectIds(prev => {
            if (prev.includes(projectId)) {
                return prev.filter(id => id !== projectId)
            } else {
                return [...prev, projectId]
            }
        })
    }

    const handleSelectAll = () => {
        if (selectedProjectIds.length === filteredProjects.length) {
            setSelectedProjectIds([])
        } else {
            setSelectedProjectIds(filteredProjects.map(p => p.id))
        }
    }

    const handleSave = async () => {
        if (!user) return

        try {
            setSaving(true)
            await onSave(user.id, selectedProjectIds)
            onClose()
        } catch (error) {
            console.error('Error saving assignments:', error)
        } finally {
            setSaving(false)
        }
    }

    const filteredProjects = projects.filter(project =>
        project.is_active !== false && (
            project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            project.address?.toLowerCase().includes(searchTerm.toLowerCase())
        )
    )

    if (!user) return null

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Asignar Obras a ${user.full_name}`}
            className="max-w-2xl"
        >
            <div className="flex flex-col h-[500px]">
                <div className="mb-4">
                    <p className="text-sm text-slate-400 mb-4">
                        Selecciona las obras a las que este usuario tendrá acceso.
                        Los usuarios solo pueden ver y gestionar información de las obras asignadas.
                    </p>

                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Buscar obras..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>

                <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-slate-400">
                        {filteredProjects.length} obras encontradas
                    </span>
                    <button
                        onClick={handleSelectAll}
                        className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
                    >
                        {selectedProjectIds.length === filteredProjects.length && filteredProjects.length > 0
                            ? 'Deseleccionar todas'
                            : 'Seleccionar todas las visibles'}
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto bg-slate-900/50 border border-slate-700 rounded-lg p-2 space-y-2">
                    {projectsLoading ? (
                        <div className="flex justify-center items-center h-full text-slate-400">
                            Cargando obras...
                        </div>
                    ) : filteredProjects.length === 0 ? (
                        <div className="flex justify-center items-center h-full text-slate-500">
                            No se encontraron obras
                        </div>
                    ) : (
                        filteredProjects.map(project => (
                            <div
                                key={project.id}
                                onClick={() => handleToggleProject(project.id)}
                                className={`flex items-center p-3 rounded-lg cursor-pointer transition-colors border ${selectedProjectIds.includes(project.id)
                                        ? 'bg-blue-900/20 border-blue-500/50'
                                        : 'bg-slate-800 border-slate-700 hover:border-slate-600'
                                    }`}
                            >
                                <div className={`w-5 h-5 rounded border flex items-center justify-center mr-3 transition-colors ${selectedProjectIds.includes(project.id)
                                        ? 'bg-blue-500 border-blue-500'
                                        : 'border-slate-500 bg-transparent'
                                    }`}>
                                    {selectedProjectIds.includes(project.id) && (
                                        <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                        </svg>
                                    )}
                                </div>
                                <div className="flex-1">
                                    <h4 className={`text-sm font-medium ${selectedProjectIds.includes(project.id) ? 'text-blue-200' : 'text-slate-200'}`}>
                                        {project.name}
                                    </h4>
                                    {project.address && (
                                        <p className="text-xs text-slate-500 truncate">
                                            {project.address}
                                        </p>
                                    )}
                                </div>
                                {project.status === 'activo' ? (
                                    <span className="text-[10px] bg-emerald-900/30 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30">
                                        Activo
                                    </span>
                                ) : (
                                    <span className="text-[10px] bg-slate-700 text-slate-400 px-2 py-0.5 rounded-full">
                                        {project.status}
                                    </span>
                                )}
                            </div>
                        ))
                    )}
                </div>

                <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-slate-700">
                    <Button
                        variant="ghost"
                        onClick={onClose}
                        disabled={saving}
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={saving}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                        {saving ? 'Guardando...' : `Guardar Asignaciones (${selectedProjectIds.length})`}
                    </Button>
                </div>
            </div>
        </Modal>
    )
}

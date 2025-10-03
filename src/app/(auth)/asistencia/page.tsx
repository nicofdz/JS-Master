'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { useAttendance } from '@/hooks/useAttendance'
import { useWorkers } from '@/hooks/useWorkers'
import { useProjects } from '@/hooks/useProjects'
import { useProjectFilter } from '@/hooks/useProjectFilter'
import { Calendar, Check, X, Clock, Users, Filter } from 'lucide-react'
import toast from 'react-hot-toast'

export default function AsistenciaPage() {
  const { attendances, loading, markAttendance, deleteAttendance, fetchAttendances } = useAttendance()
  const { workers } = useWorkers()
  const { projects } = useProjects()
  const { selectedProjectId, setSelectedProjectId } = useProjectFilter()

  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState<Record<number, string>>({})
  const [markedWorkers, setMarkedWorkers] = useState<Set<number>>(new Set())
  const [showOnlyDayWorkers, setShowOnlyDayWorkers] = useState(true)

  // Filtrar trabajadores activos y opcionalmente solo los que cobran por día
  const filteredWorkers = workers.filter(w => {
    if (!w.is_active) return false
    if (showOnlyDayWorkers && w.contract_type !== 'por_dia') return false
    return true
  })

  // Cargar asistencias cuando cambie la fecha o el proyecto
  useEffect(() => {
    const projectId = selectedProjectId ? parseInt(selectedProjectId) : null
    fetchAttendances(selectedDate, projectId)
  }, [selectedDate, selectedProjectId])

  // Actualizar trabajadores marcados cuando carguen las asistencias
  useEffect(() => {
    const marked = new Set<number>()
    attendances.forEach(a => {
      if (a.is_present) {
        marked.add(a.worker_id)
      }
    })
    setMarkedWorkers(marked)
  }, [attendances])

  const handleToggleAttendance = async (workerId: number, currentStatus: boolean) => {
    try {
      if (currentStatus) {
        // Si está marcado como presente, eliminar la asistencia
        const attendance = attendances.find(
          a => a.worker_id === workerId && 
               a.attendance_date === selectedDate &&
               a.project_id === selectedProjectId
        )
        
        if (attendance) {
          await deleteAttendance(attendance.id)
          
          // Actualizar estado local
          setMarkedWorkers(prev => {
            const newSet = new Set(prev)
            newSet.delete(workerId)
            return newSet
          })
          
          // Limpiar la nota
          setNotes(prev => {
            const newNotes = { ...prev }
            delete newNotes[workerId]
            return newNotes
          })
        }
      } else {
        // Si no está marcado, crear/actualizar asistencia
        await markAttendance({
          worker_id: workerId,
          project_id: selectedProjectId ? parseInt(selectedProjectId) : null,
          attendance_date: selectedDate,
          is_present: true,
          notes: notes[workerId] || null
        })

        // Actualizar estado local
        setMarkedWorkers(prev => {
          const newSet = new Set(prev)
          newSet.add(workerId)
          return newSet
        })
      }
    } catch (err) {
      console.error('Error toggling attendance:', err)
    }
  }

  const handleNoteChange = (workerId: number, note: string) => {
    setNotes(prev => ({
      ...prev,
      [workerId]: note
    }))
  }

  const presentCount = markedWorkers.size
  const absentCount = filteredWorkers.length - presentCount

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Control de Asistencia</h1>
          <p className="text-slate-400 mt-1">Registra la asistencia diaria de los trabajadores</p>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-slate-800/50 border-slate-700">
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Total Trabajadores</p>
                <p className="text-2xl font-bold text-slate-100 mt-1">{filteredWorkers.length}</p>
              </div>
              <div className="p-3 bg-blue-900/30 rounded-lg">
                <Users className="w-6 h-6 text-blue-400" />
              </div>
            </div>
          </div>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Presentes</p>
                <p className="text-2xl font-bold text-emerald-400 mt-1">{presentCount}</p>
              </div>
              <div className="p-3 bg-emerald-900/30 rounded-lg">
                <Check className="w-6 h-6 text-emerald-400" />
              </div>
            </div>
          </div>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Ausentes</p>
                <p className="text-2xl font-bold text-red-400 mt-1">{absentCount}</p>
              </div>
              <div className="p-3 bg-red-900/30 rounded-lg">
                <X className="w-6 h-6 text-red-400" />
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Filtros */}
      <Card className="bg-slate-800/50 border-slate-700">
        <div className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-slate-400" />
            <h2 className="text-lg font-semibold text-slate-100">Filtros</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Fecha */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Fecha
              </label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full"
              />
            </div>

            {/* Proyecto */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Proyecto
              </label>
              <Select
                value={selectedProjectId?.toString() || ''}
                onChange={(e) => setSelectedProjectId(e.target.value || null)}
                className="w-full"
              >
                <option value="">Todos los proyectos</option>
                {projects.map(project => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </Select>
            </div>

            {/* Filtro por tipo de contrato */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Mostrar
              </label>
              <Select
                value={showOnlyDayWorkers ? 'por_dia' : 'todos'}
                onChange={(e) => setShowOnlyDayWorkers(e.target.value === 'por_dia')}
                className="w-full"
              >
                <option value="por_dia">Solo trabajadores por día</option>
                <option value="todos">Todos los trabajadores</option>
              </Select>
            </div>
          </div>
        </div>
      </Card>

      {/* Lista de Asistencia */}
      <Card className="bg-slate-800/50 border-slate-700">
        <div className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-slate-400" />
            <h2 className="text-lg font-semibold text-slate-100">
              Lista de Asistencia - {new Date(selectedDate + 'T00:00:00').toLocaleDateString('es-CL', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </h2>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
              <p className="text-slate-400 mt-4">Cargando trabajadores...</p>
            </div>
          ) : filteredWorkers.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">No hay trabajadores disponibles</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredWorkers.map(worker => {
                const isPresent = markedWorkers.has(worker.id)
                const attendance = attendances.find(a => a.worker_id === worker.id)
                
                return (
                  <div
                    key={worker.id}
                    className={`flex items-center justify-between p-4 rounded-lg border transition-all ${
                      isPresent
                        ? 'bg-emerald-900/20 border-emerald-600'
                        : 'bg-slate-700/30 border-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-4 flex-1">
                      {/* Checkbox de asistencia */}
                      <button
                        onClick={() => handleToggleAttendance(worker.id, isPresent)}
                        className={`flex-shrink-0 w-10 h-10 rounded-lg border-2 flex items-center justify-center transition-all ${
                          isPresent
                            ? 'bg-emerald-600 border-emerald-500'
                            : 'bg-slate-700 border-slate-500 hover:border-slate-400'
                        }`}
                      >
                        {isPresent && <Check className="w-6 h-6 text-white" />}
                      </button>

                      {/* Información del trabajador */}
                      <div className="flex-1">
                        <p className="font-medium text-slate-100">{worker.full_name}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <p className="text-sm text-slate-400">{worker.rut}</p>
                          <span className={`text-xs px-2 py-1 rounded ${
                            worker.contract_type === 'por_dia'
                              ? 'bg-blue-900/30 text-blue-400'
                              : 'bg-purple-900/30 text-purple-400'
                          }`}>
                            {worker.contract_type === 'por_dia' ? 'Por Día' : 'A Trato'}
                          </span>
                          {attendance?.check_in_time && (
                            <span className="flex items-center gap-1 text-xs text-slate-400">
                              <Clock className="w-3 h-3" />
                              {new Date(attendance.check_in_time).toLocaleTimeString('es-CL', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Campo de notas */}
                      <div className="w-64">
                        <Input
                          type="text"
                          placeholder="Notas (opcional)"
                          value={notes[worker.id] || attendance?.notes || ''}
                          onChange={(e) => handleNoteChange(worker.id, e.target.value)}
                          onBlur={() => {
                            if (isPresent && notes[worker.id] !== attendance?.notes) {
                              markAttendance({
                                worker_id: worker.id,
                                project_id: selectedProjectId ? parseInt(selectedProjectId) : null,
                                attendance_date: selectedDate,
                                is_present: true,
                                notes: notes[worker.id] || null
                              })
                            }
                          }}
                          className="text-sm"
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}


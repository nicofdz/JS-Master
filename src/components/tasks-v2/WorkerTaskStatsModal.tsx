'use client'

import { useState, useEffect } from 'react'
import { ModalV2 } from './ModalV2'
import { supabase } from '@/lib/supabase'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts'
import { TrendingUp, Clock, CheckCircle, Target, Calendar, Briefcase, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

interface WorkerTaskStatsModalProps {
  isOpen: boolean
  onClose: () => void
  workerId: number
  workerName?: string
  workerRut?: string
}

interface WorkerStatsData {
  general: {
    total_completed: number
    avg_hours: number
    avg_days: number
    total_estimated_hours: number
    avg_estimated_hours: number
    efficiency_percentage: number | null
  }
  by_category: Array<{
    category: string
    total_tasks: number
    avg_hours: number
    avg_days: number
    total_estimated_hours: number
    avg_estimated_hours: number
  }>
  by_project: Array<{
    project_id: number
    project_name: string
    total_tasks: number
    avg_hours: number
    avg_days: number
  }>
  by_month: Array<{
    year: number
    month: number
    month_name: string
    total_tasks: number
    avg_hours: number
    avg_days: number
  }>
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

export function WorkerTaskStatsModal({ isOpen, onClose, workerId, workerName, workerRut }: WorkerTaskStatsModalProps) {
  const [loading, setLoading] = useState(true)
  const [statsData, setStatsData] = useState<WorkerStatsData | null>(null)
  const [workerInfo, setWorkerInfo] = useState<{ name: string; rut: string; projects: string[] } | null>(null)
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null)
  const [filterType, setFilterType] = useState<'general' | 'month' | 'contract'>('general')

  useEffect(() => {
    if (isOpen && workerId) {
      loadWorkerInfo()
      loadStats()
    } else {
      setStatsData(null)
      setWorkerInfo(null)
      setSelectedProjectId(null)
      setFilterType('general')
    }
  }, [isOpen, workerId])

  const loadWorkerInfo = async () => {
    try {
      const { data: worker, error } = await supabase
        .from('workers')
        .select('full_name, rut')
        .eq('id', workerId)
        .single()

      if (error) throw error

      // Obtener proyectos donde ha trabajado desde task_assignments
      const { data: projectsData, error: projectsError } = await supabase
        .from('task_assignments')
        .select(`
          tasks!inner(
            apartments!inner(
              floors!inner(
                projects!inner(name)
              )
            )
          )
        `)
        .eq('worker_id', workerId)
        .eq('is_deleted', false)
        .eq('assignment_status', 'completed')

      if (projectsError) throw projectsError

      const projectNamesSet = new Set<string>()
      if (projectsData) {
        projectsData.forEach((ta: any) => {
          if (ta.tasks?.apartments?.floors?.projects?.name) {
            projectNamesSet.add(ta.tasks.apartments.floors.projects.name)
          }
        })
      }

      setWorkerInfo({
        name: workerName || worker.full_name,
        rut: workerRut || worker.rut,
        projects: Array.from(projectNamesSet)
      })
    } catch (err: any) {
      console.error('Error loading worker info:', err)
      toast.error('Error al cargar información del trabajador')
    }
  }

  const loadStats = async (projectId: number | null = null, month: number | null = null, year: number | null = null) => {
    if (!workerId) return

    setLoading(true)
    try {
      const { data, error } = await supabase.rpc('get_worker_task_stats', {
        p_worker_id: workerId,
        p_project_id: projectId,
        p_contract_id: null, // Por ahora no filtramos por contrato
        p_month: month,
        p_year: year
      })

      if (error) throw error

      setStatsData(data as WorkerStatsData)
    } catch (err: any) {
      console.error('Error loading stats:', err)
      toast.error('Error al cargar estadísticas')
    } finally {
      setLoading(false)
    }
  }

  const handleProjectChange = (projectId: number | null) => {
    setSelectedProjectId(projectId)
    loadStats(projectId, null, null)
  }

  const formatHours = (hours: number) => {
    if (!hours || hours === 0) return '0h'
    const h = Math.floor(hours)
    const m = Math.round((hours - h) * 60)
    return m > 0 ? `${h}h ${m}m` : `${h}h`
  }

  const formatDays = (days: number) => {
    if (!days || days === 0) return '0 días'
    const d = Math.floor(days)
    const h = Math.round((days - d) * 24)
    return h > 0 ? `${d}d ${h}h` : `${d} días`
  }

  if (!isOpen) return null

  return (
    <ModalV2
      isOpen={isOpen}
      onClose={onClose}
      title="Estadísticas de Rendimiento"
      size="4xl"
    >
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : statsData ? (
        <div className="space-y-6">
          {/* Información del trabajador */}
          {workerInfo && (
            <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-100">{workerInfo.name}</h3>
                  <p className="text-sm text-slate-400">RUT: {workerInfo.rut}</p>
                </div>
                {workerInfo.projects.length > 0 && (
                  <div className="text-right">
                    <p className="text-xs text-slate-400 mb-1">Proyectos:</p>
                    <p className="text-sm text-slate-300">{workerInfo.projects.join(', ')}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tabs por proyecto */}
          {statsData.by_project && statsData.by_project.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => handleProjectChange(null)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedProjectId === null
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                Todos los Proyectos
              </button>
              {statsData.by_project.map((project) => (
                <button
                  key={project.project_id}
                  onClick={() => handleProjectChange(project.project_id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedProjectId === project.project_id
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {project.project_name}
                </button>
              ))}
            </div>
          )}

          {/* Estadísticas generales */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-sm text-slate-400">Tareas Completadas</span>
              </div>
              <p className="text-2xl font-bold text-slate-100">{statsData.general.total_completed}</p>
            </div>

            <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-5 h-5 text-blue-500" />
                <span className="text-sm text-slate-400">Tiempo Promedio</span>
              </div>
              <p className="text-2xl font-bold text-slate-100">{formatHours(statsData.general.avg_hours)}</p>
              <p className="text-xs text-slate-400 mt-1">{formatDays(statsData.general.avg_days)}</p>
            </div>

            <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-5 h-5 text-yellow-500" />
                <span className="text-sm text-slate-400">Horas Estimadas (Prom)</span>
              </div>
              <p className="text-2xl font-bold text-slate-100">{formatHours(statsData.general.avg_estimated_hours)}</p>
            </div>

            <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-purple-500" />
                <span className="text-sm text-slate-400">Eficiencia</span>
              </div>
              <p className="text-2xl font-bold text-slate-100">
                {statsData.general.efficiency_percentage !== null
                  ? `${statsData.general.efficiency_percentage.toFixed(1)}%`
                  : 'N/A'}
              </p>
            </div>
          </div>

          {/* Gráficos por categoría */}
          {statsData.by_category && statsData.by_category.length > 0 && (
            <div className="space-y-6">
              {/* Gráfico de barras: Tiempo promedio por categoría */}
              <div className="bg-slate-700/50 rounded-lg p-6 border border-slate-600">
                <h3 className="text-lg font-semibold text-slate-100 mb-4">Tiempo Promedio por Categoría</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={statsData.by_category}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                    <XAxis dataKey="category" stroke="#cbd5e1" />
                    <YAxis stroke="#cbd5e1" />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }}
                      formatter={(value: number) => formatHours(value)}
                    />
                    <Legend />
                    <Bar dataKey="avg_hours" name="Tiempo Real (h)" fill="#3b82f6" />
                    <Bar dataKey="avg_estimated_hours" name="Tiempo Estimado (h)" fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Gráfico de barras: Cantidad de tareas por categoría */}
              <div className="bg-slate-700/50 rounded-lg p-6 border border-slate-600">
                <h3 className="text-lg font-semibold text-slate-100 mb-4">Cantidad de Tareas por Categoría</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={statsData.by_category}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                    <XAxis dataKey="category" stroke="#cbd5e1" />
                    <YAxis stroke="#cbd5e1" />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }}
                    />
                    <Legend />
                    <Bar dataKey="total_tasks" name="Tareas Completadas" fill="#8b5cf6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Gráfico de pastel: Distribución por categoría */}
              <div className="bg-slate-700/50 rounded-lg p-6 border border-slate-600">
                <h3 className="text-lg font-semibold text-slate-100 mb-4">Distribución de Tareas por Categoría</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={statsData.by_category}
                      dataKey="total_tasks"
                      nameKey="category"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={({ category, percent }) => `${category}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {statsData.by_category.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Mensaje si no hay datos */}
          {(!statsData.by_category || statsData.by_category.length === 0) && (
            <div className="text-center py-12 bg-slate-700/50 rounded-lg border border-slate-600">
              <p className="text-slate-400">No hay datos de tareas completadas para mostrar</p>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-slate-400">No se pudieron cargar las estadísticas</p>
        </div>
      )}
    </ModalV2>
  )
}


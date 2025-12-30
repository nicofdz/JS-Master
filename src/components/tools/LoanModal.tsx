import { useState } from 'react'
import { X, Hand, ArrowLeft, Clock, User as UserIcon } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { Modal } from '@/components/ui/Modal'
import clsx from 'clsx'

interface Tool {
  id: number
  name: string
  brand: string
  status: string
  value: number
  location: string
  details: string
  image_url?: string | null
}

interface Loan {
  id: number
  tool_id: number
  borrower_id: number
  lender_id: string
  loan_date: string
  return_date: string | null
  return_details: string | null
  project_id?: number | null
}

interface LoanModalProps {
  tool: Tool
  workers: Array<{ id: number; full_name: string }>
  users: Array<{ id: string; full_name: string }>
  projects: Array<{ id: number; name: string }>
  currentUserId: string
  onClose: () => void
  onLoan: (borrowerId: number, lenderId: string, projectId?: number) => Promise<void>
  onReturn: (loanId: number, returnDetails: string) => Promise<void>
  activeLoanId?: number
  activeLoan?: Loan
}

export function LoanModal({ tool, workers, users, projects, currentUserId, onClose, onLoan, onReturn, activeLoanId, activeLoan }: LoanModalProps) {
  const [selectedBorrowerId, setSelectedBorrowerId] = useState<number | ''>('')
  const [selectedLenderId, setSelectedLenderId] = useState<string>(currentUserId)
  const [selectedProjectId, setSelectedProjectId] = useState<number | ''>('')
  const [returnDetails, setReturnDetails] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const isLoaned = tool.status === 'prestada'

  const borrowerName = activeLoan
    ? workers.find(w => w.id === activeLoan.borrower_id)?.full_name || 'Desconocido'
    : 'Desconocido'

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!isLoaned) {
      if (!selectedBorrowerId) {
        newErrors.borrowerId = 'Debe seleccionar un trabajador'
      }
      if (!selectedLenderId) {
        newErrors.lenderId = 'Debe seleccionar un prestador'
      }
    } else {
      if (!returnDetails.trim()) {
        newErrors.returnDetails = 'Los detalles de devolución son requeridos'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (validateForm()) {
      if (isLoaned && activeLoanId) {
        onReturn?.(activeLoanId, returnDetails)
      } else {
        const projectId = selectedProjectId === '' ? undefined : selectedProjectId as number
        onLoan(selectedBorrowerId as number, selectedLenderId, projectId)
      }
    }
  }

  const handleChange = (field: string, value: string | number) => {
    if (field === 'borrowerId') setSelectedBorrowerId(value as number)
    if (field === 'lenderId') setSelectedLenderId(value as string)
    if (field === 'projectId') setSelectedProjectId(value as number)
    if (field === 'returnDetails') setReturnDetails(value as string)

    // Limpiar error del campo
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }))
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200 backdrop-blur-sm">
      <div className="bg-slate-900 rounded-xl shadow-2xl shadow-black/50 max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col md:flex-row border border-slate-800 animate-in zoom-in-95 duration-200 text-slate-200">

        {/* Left Side - Tool Graph/Image & Info */}
        <div className="w-full md:w-1/3 bg-slate-800/50 border-r border-slate-800 p-6 flex flex-col">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Herramienta</h3>

          <div className="w-full aspect-square bg-slate-800 rounded-lg border border-slate-700/50 overflow-hidden mb-4 shadow-inner relative">
            {tool.image_url ? (
              <img
                src={tool.image_url}
                alt={tool.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-600">
                <Hand className="w-16 h-16 opacity-20" />
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div>
              <p className="font-bold text-slate-100 text-lg leading-tight">{tool.name}</p>
              <p className="text-blue-400 text-sm font-medium">{tool.brand}</p>
            </div>

            <div className="pt-4 border-t border-slate-700/50 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500 font-medium uppercase">Estado Actual</span>
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${tool.status === 'prestada'
                  ? 'bg-orange-900/30 text-orange-400 border-orange-600/30'
                  : 'bg-emerald-900/30 text-emerald-400 border-emerald-600/30'
                  }`}>
                  {tool.status === 'prestada' ? 'PRESTADA' : 'DISPONIBLE'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500 font-medium uppercase">Ubicación</span>
                <span className="text-xs text-slate-300 font-medium truncate ml-2 text-right">{tool.location}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500 font-medium uppercase">Valor</span>
                <span className="text-xs text-slate-300 font-medium">${tool.value.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Form */}
        <div className="flex-1 flex flex-col bg-slate-900">
          <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900 sticky top-0 z-10">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                {isLoaned ? <ArrowLeft className="w-5 h-5 text-orange-500" /> : <Hand className="w-5 h-5 text-emerald-500" />}
                {isLoaned ? 'Devolver Herramienta' : 'Registrar Préstamo'}
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                {isLoaned ? 'Registre el retorno de la herramienta al inventario.' : 'Complete los datos para asignar la herramienta.'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white hover:bg-slate-800 p-2 rounded-full transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900">
            <form id="loan-form" onSubmit={handleSubmit} className="space-y-6">
              {!isLoaned ? (
                // Formulario para prestar
                <div className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-400 block">
                      Trabajador (Prestatario) *
                    </label>
                    <Select
                      value={selectedBorrowerId}
                      onChange={(e) => handleChange('borrowerId', parseInt(e.target.value))}
                      className={clsx(
                        "w-full bg-slate-800/50 border-slate-700 text-slate-200 focus:ring-blue-500 focus:border-blue-500",
                        errors.borrowerId && "border-red-500 focus:ring-red-500"
                      )}
                    >
                      <option value="">Seleccionar trabajador...</option>
                      {workers.map((worker) => (
                        <option key={worker.id} value={worker.id}>
                          {worker.full_name}
                        </option>
                      ))}
                    </Select>
                    {errors.borrowerId && (
                      <p className="text-xs text-red-400 font-medium mt-1">{errors.borrowerId}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-400 block">
                      Responsable de Entrega (Prestador) *
                    </label>
                    <Select
                      value={selectedLenderId}
                      onChange={(e) => handleChange('lenderId', e.target.value)}
                      className={clsx(
                        "w-full bg-slate-800/50 border-slate-700 text-slate-200 focus:ring-blue-500 focus:border-blue-500",
                        errors.lenderId && "border-red-500 focus:ring-red-500"
                      )}
                    >
                      <option value="">Seleccionar usuario...</option>
                      {users.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.full_name}
                        </option>
                      ))}
                    </Select>
                    {errors.lenderId && (
                      <p className="text-xs text-red-400 font-medium mt-1">{errors.lenderId}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-400 block">
                      Obra / Proyecto (Opcional)
                    </label>
                    <Select
                      value={selectedProjectId}
                      onChange={(e) => handleChange('projectId', e.target.value === '' ? '' : parseInt(e.target.value))}
                      className="w-full bg-slate-800/50 border-slate-700 text-slate-200 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">-- Sin asignación de obra --</option>
                      {projects.map((project) => (
                        <option key={project.id} value={project.id}>
                          🏢 {project.name}
                        </option>
                      ))}
                    </Select>
                    <p className="text-xs text-slate-500">Útil para filtrar herramientas por obra y controlar costos.</p>
                  </div>
                </div>
              ) : (
                // Formulario para devolver
                <div className="space-y-6">
                  <div className="bg-orange-900/20 border border-orange-500/30 rounded-lg p-5 flex items-start gap-4">
                    <div className="bg-orange-500/20 p-2.5 rounded-full text-orange-400 shrink-0">
                      <Clock className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-orange-400 text-base">Préstamo Activo</h4>
                      <div className="mt-2 flex items-center gap-2 text-slate-300 bg-orange-900/40 px-3 py-1.5 rounded-md border border-orange-500/20 w-fit">
                        <UserIcon className="w-4 h-4 text-orange-400" />
                        <span className="text-sm font-medium">Prestada a: <span className="text-white ml-1">{borrowerName}</span></span>
                      </div>
                      <p className="text-sm text-slate-400 mt-2 leading-relaxed">
                        Esta herramienta está actualmente asignada. Al confirmar la devolución, se marcará automáticamente como <span className="text-emerald-400 font-semibold">Disponible</span>.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-400 block">
                      Detalles de Devolución / Estado *
                    </label>
                    <Textarea
                      value={returnDetails}
                      onChange={(e) => handleChange('returnDetails', e.target.value)}
                      placeholder="Describa el estado en que se devuelve la herramienta (limpieza, daños, funcionamiento, accesorios...)"
                      rows={4}
                      className={clsx(
                        "w-full bg-slate-800/50 border-slate-700 text-slate-200 placeholder:text-slate-600 resize-none focus:ring-orange-500 focus:border-orange-500",
                        errors.returnDetails && "border-red-500 focus:ring-red-500"
                      )}
                    />
                    {errors.returnDetails && (
                      <p className="text-xs text-red-500 font-medium mt-1">{errors.returnDetails}</p>
                    )}
                  </div>
                </div>
              )}
            </form>
          </div>

          <div className="p-6 border-t border-slate-800 bg-slate-900 flex justify-end gap-3 sticky bottom-0">
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
              className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              form="loan-form"
              className={isLoaned
                ? 'bg-orange-600 hover:bg-orange-700 text-white shadow-lg shadow-orange-500/20'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20'
              }
            >
              {isLoaned ? (
                <>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Confirmar Devolución
                </>
              ) : (
                <>
                  <Hand className="w-4 h-4 mr-2" />
                  Registrar Préstamo
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}


'use client'

import { Card, CardContent } from '@/components/ui/Card'
import { LucideIcon } from 'lucide-react'

export interface StatusFilterOption {
  value: string
  label: string
  icon: LucideIcon
  count: number
  activeColor: string
  activeBg: string
  activeBorder: string
}

interface StatusFilterCardsProps {
  options: StatusFilterOption[]
  selectedValue: string
  onSelect: (value: string) => void
  defaultOption?: {
    value: string
    label: string
    icon: LucideIcon
    count: number
    activeColor: string
    activeBg: string
    activeBorder: string
  }
  scrollTargetId?: string
}

/**
 * Componente reutilizable para tarjetas de filtro de estado
 * 
 * Estilo aplicado:
 * - Fondo oscuro: bg-slate-800/50 o bg-slate-700/30
 * - Bordes: border-2 con colores específicos cuando están activas
 * - Texto: tonos slate (100, 300, 400)
 * - Diseño centrado: icono y etiqueta centrados horizontalmente, número grande centrado debajo
 * - Estados activos: bg-{color}-900/30 border-{color}-500 con text-{color}-400
 * - Transiciones: transition-all duration-200 y hover en estados inactivos
 * 
 * Ejemplo de uso:
 * ```tsx
 * const statusOptions: StatusFilterOption[] = [
 *   {
 *     value: 'pending',
 *     label: 'Pendientes',
 *     icon: Clock,
 *     count: pendingCount,
 *     activeColor: 'yellow-400',
 *     activeBg: 'yellow-900/30',
 *     activeBorder: 'yellow-500'
 *   },
 *   // ... más opciones
 * ]
 * 
 * <StatusFilterCards
 *   options={statusOptions}
 *   selectedValue={statusFilter}
 *   onSelect={setStatusFilter}
 *   defaultOption={{
 *     value: 'all',
 *     label: 'Todos',
 *     icon: Layers,
 *     count: totalCount,
 *     activeColor: 'blue-400',
 *     activeBg: 'blue-900/30',
 *     activeBorder: 'blue-500'
 *   }}
 * />
 * ```
 */
export function StatusFilterCards({ 
  options = [], 
  selectedValue, 
  onSelect,
  defaultOption,
  scrollTargetId
}: StatusFilterCardsProps) {
  const handleSelect = (value: string) => {
    onSelect(value)
    if (scrollTargetId) {
      setTimeout(() => {
        document.getElementById(scrollTargetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 100)
    }
  }
  // Calcular el número de columnas según la cantidad de opciones
  const totalCards = (defaultOption ? 1 : 0) + (options?.length || 0)
  const gridCols = totalCards === 3 ? 'md:grid-cols-3' : totalCards === 4 ? 'md:grid-cols-4' : totalCards === 5 ? 'md:grid-cols-5' : totalCards === 6 ? 'md:grid-cols-6' : 'md:grid-cols-4'
  
  return (
    <div className={`grid grid-cols-1 ${gridCols} gap-4 mb-6`}>
      {/* Tarjeta por defecto (Todos) */}
      {defaultOption && (
        <Card 
          className={`cursor-pointer transition-all duration-200 border-2 ${
            selectedValue === defaultOption.value
              ? defaultOption.activeBg === 'blue-900/30' 
                ? 'bg-blue-900/30 border-blue-500 shadow-lg'
                : defaultOption.activeBg === 'emerald-900/30'
                ? 'bg-emerald-900/30 border-emerald-500 shadow-lg'
                : defaultOption.activeBg === 'yellow-900/30'
                ? 'bg-yellow-900/30 border-yellow-500 shadow-lg'
                : defaultOption.activeBg === 'red-900/30'
                ? 'bg-red-900/30 border-red-500 shadow-lg'
                : defaultOption.activeBg === 'orange-900/30'
                ? 'bg-orange-900/30 border-orange-500 shadow-lg'
                : 'bg-slate-700/30 border-slate-600 shadow-lg'
              : 'bg-slate-700/30 border-slate-600 hover:border-slate-500'
          }`}
          onClick={() => handleSelect(defaultOption.value)}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-center gap-2 mb-2">
              <defaultOption.icon className={`w-5 h-5 ${
                selectedValue === defaultOption.value 
                  ? defaultOption.activeColor === 'blue-400' 
                    ? 'text-blue-400'
                    : defaultOption.activeColor === 'emerald-400'
                    ? 'text-emerald-400'
                    : defaultOption.activeColor === 'yellow-400'
                    ? 'text-yellow-400'
                    : defaultOption.activeColor === 'red-400'
                    ? 'text-red-400'
                    : defaultOption.activeColor === 'orange-400'
                    ? 'text-orange-400'
                    : 'text-slate-400'
                  : 'text-slate-400'
              }`} />
              <span className={`font-semibold ${
                selectedValue === defaultOption.value 
                  ? defaultOption.activeColor === 'blue-400' 
                    ? 'text-blue-400'
                    : defaultOption.activeColor === 'emerald-400'
                    ? 'text-emerald-400'
                    : defaultOption.activeColor === 'yellow-400'
                    ? 'text-yellow-400'
                    : defaultOption.activeColor === 'red-400'
                    ? 'text-red-400'
                    : defaultOption.activeColor === 'orange-400'
                    ? 'text-orange-400'
                    : 'text-slate-300'
                  : 'text-slate-300'
              }`}>
                {defaultOption.label}
              </span>
            </div>
            <div className={`text-2xl font-bold text-center ${
              selectedValue === defaultOption.value 
                ? defaultOption.activeColor === 'blue-400' 
                  ? 'text-blue-400'
                  : defaultOption.activeColor === 'emerald-400'
                  ? 'text-emerald-400'
                  : defaultOption.activeColor === 'yellow-400'
                  ? 'text-yellow-400'
                  : defaultOption.activeColor === 'red-400'
                  ? 'text-red-400'
                  : defaultOption.activeColor === 'orange-400'
                  ? 'text-orange-400'
                  : 'text-slate-400'
                : 'text-slate-400'
            }`}>
              {defaultOption.count}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tarjetas de opciones */}
      {options.map((option) => {
        const Icon = option.icon
        const isActive = selectedValue === option.value
        
        const getActiveClasses = () => {
          if (!isActive) return 'bg-slate-700/30 border-slate-600 hover:border-slate-500'
          
          if (option.activeBg === 'blue-900/30') return 'bg-blue-900/30 border-blue-500 shadow-lg'
          if (option.activeBg === 'emerald-900/30') return 'bg-emerald-900/30 border-emerald-500 shadow-lg'
          if (option.activeBg === 'yellow-900/30') return 'bg-yellow-900/30 border-yellow-500 shadow-lg'
          if (option.activeBg === 'red-900/30') return 'bg-red-900/30 border-red-500 shadow-lg'
          if (option.activeBg === 'orange-900/30') return 'bg-orange-900/30 border-orange-500 shadow-lg'
          return 'bg-slate-700/30 border-slate-600 shadow-lg'
        }
        
        const getActiveTextColor = () => {
          if (!isActive) return 'text-slate-400'
          
          if (option.activeColor === 'blue-400') return 'text-blue-400'
          if (option.activeColor === 'emerald-400') return 'text-emerald-400'
          if (option.activeColor === 'yellow-400') return 'text-yellow-400'
          if (option.activeColor === 'red-400') return 'text-red-400'
          if (option.activeColor === 'orange-400') return 'text-orange-400'
          return 'text-slate-400'
        }
        
        const getActiveLabelColor = () => {
          if (!isActive) return 'text-slate-300'
          
          if (option.activeColor === 'blue-400') return 'text-blue-400'
          if (option.activeColor === 'emerald-400') return 'text-emerald-400'
          if (option.activeColor === 'yellow-400') return 'text-yellow-400'
          if (option.activeColor === 'red-400') return 'text-red-400'
          if (option.activeColor === 'orange-400') return 'text-orange-400'
          return 'text-slate-300'
        }
        
        return (
          <Card 
            key={option.value}
            className={`cursor-pointer transition-all duration-200 border-2 ${getActiveClasses()}`}
            onClick={() => handleSelect(option.value)}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Icon className={`w-5 h-5 ${getActiveTextColor()}`} />
                <span className={`font-semibold ${getActiveLabelColor()}`}>
                  {option.label}
                </span>
              </div>
              <div className={`text-2xl font-bold text-center ${getActiveTextColor()}`}>
                {option.count}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}


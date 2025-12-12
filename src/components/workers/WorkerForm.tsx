import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { WorkerFormData } from '@/hooks/useWorkers'
import { validateRut, formatRut, cleanRut } from '@/lib/rut'

interface WorkerFormProps {
  worker?: any
  initialData?: Partial<WorkerFormData>
  onSave: (data: WorkerFormData) => void
  onCancel: () => void
}

export function WorkerForm({ worker, initialData, onSave, onCancel }: WorkerFormProps) {
  const [formData, setFormData] = useState<WorkerFormData>({
    full_name: '',
    rut: '',
    email: '',
    phone: '',
    is_active: true,
    contract_type: 'por_dia',
    daily_rate: 0,
    // Campos adicionales
    nacionalidad: 'Chilena',
    ciudad: '',
    direccion: '',
    estado_civil: '',
    fecha_nacimiento: '',
    prevision: '',
    salud: '',
    cargo: '',
    cargo_personalizado: ''
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Inicializar formulario cuando se edita un trabajador o hay datos iniciales
  useEffect(() => {
    if (worker) {
      setFormData({
        full_name: worker.full_name || '',
        rut: worker.rut || '',
        email: worker.email || '',
        phone: worker.phone || '',
        is_active: worker.is_active ?? true,
        contract_type: worker.contract_type || 'por_dia',
        daily_rate: worker.daily_rate || 0,
        // Campos adicionales
        nacionalidad: worker.nacionalidad || 'Chilena',
        ciudad: worker.ciudad || '',
        direccion: worker.direccion || '',
        estado_civil: worker.estado_civil || '',
        fecha_nacimiento: worker.fecha_nacimiento || '',
        prevision: worker.prevision || '',
        salud: worker.salud || '',
        cargo: (worker.cargo && !['Obrero', 'Maestro', 'Jefe de Cuadrilla', 'Supervisor', 'Especialista', 'Ayudante', 'Maestro Tabiquero', 'Ayudante Maestro'].includes(worker.cargo)) ? 'Otro' : (worker.cargo || ''),
        cargo_personalizado: (worker.cargo && !['Obrero', 'Maestro', 'Jefe de Cuadrilla', 'Supervisor', 'Especialista', 'Ayudante', 'Maestro Tabiquero', 'Ayudante Maestro'].includes(worker.cargo)) ? worker.cargo : ''
      })
    } else if (initialData) {
      setFormData(prev => ({
        ...prev,
        ...initialData,
        // Asegurar que campos obligatorios tengan string vacio si vienen undefined
        full_name: initialData.full_name || '',
        rut: initialData.rut || '',
        email: initialData.email || '',
        phone: initialData.phone || '',
      }))
    }
  }, [worker, initialData])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    const checked = 'checked' in e.target ? e.target.checked : false

    // Formatear RUT automáticamente
    if (name === 'rut') {
      const cleanValue = cleanRut(value)
      if (cleanValue.length <= 9) { // Máximo 8 dígitos + 1 dígito verificador
        const formattedValue = formatRut(cleanValue)
        setFormData(prev => ({
          ...prev,
          [name]: formattedValue
        }))
      }
    }
    // Convertir email a minúsculas automáticamente
    else if (name === 'email') {
      setFormData(prev => ({
        ...prev,
        [name]: value.toLowerCase()
      }))
    }
    // Manejar cargo personalizado
    else if (name === 'cargo_personalizado') {
      setFormData(prev => ({
        ...prev,
        [name]: value,
        cargo: 'Otro' // Mantener "Otro" en el select para que no se resetee
      }))
    }
    // Manejar cambio de cargo en el select
    else if (name === 'cargo') {
      setFormData(prev => ({
        ...prev,
        [name]: value,
        cargo_personalizado: value === 'Otro' ? prev.cargo_personalizado : '' // Limpiar si no es "Otro"
      }))
    }
    else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }))
    }

    // Limpiar error del campo cuando el usuario empiece a escribir
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.full_name.trim()) {
      newErrors.full_name = 'El nombre es obligatorio'
    }

    if (!formData.rut.trim()) {
      newErrors.rut = 'El RUT es obligatorio'
    } else if (!validateRut(formData.rut)) {
      newErrors.rut = 'El RUT no es válido'
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'El email no es válido'
    }

    if (formData.phone && !/^[\d\s\-\+\(\)]+$/.test(formData.phone)) {
      newErrors.phone = 'El teléfono no es válido'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (validateForm()) {
      // Preparar los datos para guardar
      const dataToSave = {
        ...formData,
        // Si hay cargo personalizado, usar ese valor; sino usar el cargo del select
        cargo: formData.cargo_personalizado?.trim() || formData.cargo
      }

      onSave(dataToSave)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 gap-6">
        {/* Información Básica */}
        <div className="bg-slate-700/40 p-4 rounded-lg border border-slate-600">
          <h3 className="text-lg font-medium text-slate-100 mb-4">Información Básica</h3>

          {/* Nombre completo */}
          <div className="mb-4">
            <label htmlFor="full_name" className="block text-sm font-medium text-slate-300 mb-2">
              Nombre Completo *
            </label>
            <Input
              id="full_name"
              name="full_name"
              type="text"
              value={formData.full_name}
              onChange={handleChange}
              placeholder="Ej: Juan Pérez"
              className={errors.full_name ? 'border-red-500' : ''}
            />
            {errors.full_name && (
              <p className="mt-1 text-sm text-red-600">{errors.full_name}</p>
            )}
          </div>

          {/* RUT */}
          <div className="mb-4">
            <label htmlFor="rut" className="block text-sm font-medium text-slate-300 mb-2">
              RUT *
            </label>
            <Input
              id="rut"
              name="rut"
              type="text"
              value={formData.rut}
              onChange={handleChange}
              placeholder="con puntos y guión"
              className={errors.rut ? 'border-red-500' : ''}
            />
            {errors.rut && (
              <p className="mt-1 text-sm text-red-600">{errors.rut}</p>
            )}
          </div>

          {/* Email */}
          <div className="mb-4">
            <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">
              Email
            </label>
            <Input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Ej: juan.perez@email.com"
              className={errors.email ? 'border-red-500' : ''}
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email}</p>
            )}
          </div>

          {/* Teléfono */}
          <div className="mb-4">
            <label htmlFor="phone" className="block text-sm font-medium text-slate-300 mb-2">
              Teléfono
            </label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleChange}
              placeholder="Ej: +56 9 1234 5678"
              className={errors.phone ? 'border-red-500' : ''}
            />
            {errors.phone && (
              <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
            )}
          </div>

        </div>

        {/* Información Personal */}
        <div className="bg-slate-700/40 p-4 rounded-lg border border-slate-600">
          <h3 className="text-lg font-medium text-slate-100 mb-4">Información Personal</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Nacionalidad */}
            <div>
              <label htmlFor="nacionalidad" className="block text-sm font-medium text-slate-300 mb-2">
                Nacionalidad
              </label>
              <Select
                id="nacionalidad"
                name="nacionalidad"
                value={formData.nacionalidad}
                onChange={handleChange}
              >
                <option value="Chilena">Chilena</option>
                <option value="Peruana">Peruana</option>
                <option value="Colombiana">Colombiana</option>
                <option value="Venezolana">Venezolana</option>
                <option value="Boliviana">Boliviana</option>
                <option value="Ecuatoriana">Ecuatoriana</option>
                <option value="Argentina">Argentina</option>
                <option value="Brasileña">Brasileña</option>
                <option value="Otra">Otra</option>
              </Select>
            </div>

            {/* Ciudad */}
            <div>
              <label htmlFor="ciudad" className="block text-sm font-medium text-slate-300 mb-2">
                Ciudad
              </label>
              <Input
                id="ciudad"
                name="ciudad"
                type="text"
                value={formData.ciudad}
                onChange={handleChange}
                placeholder="Ej: Santiago"
              />
            </div>

            {/* Estado Civil */}
            <div>
              <label htmlFor="estado_civil" className="block text-sm font-medium text-slate-300 mb-2">
                Estado Civil
              </label>
              <Select
                id="estado_civil"
                name="estado_civil"
                value={formData.estado_civil}
                onChange={handleChange}
              >
                <option value="">Seleccionar...</option>
                <option value="Soltero">Soltero</option>
                <option value="Casado">Casado</option>
                <option value="Divorciado">Divorciado</option>
                <option value="Viudo">Viudo</option>
                <option value="Conviviente">Conviviente</option>
              </Select>
            </div>

            {/* Fecha de Nacimiento */}
            <div>
              <label htmlFor="fecha_nacimiento" className="block text-sm font-medium text-slate-300 mb-2">
                Fecha de Nacimiento
              </label>
              <Input
                id="fecha_nacimiento"
                name="fecha_nacimiento"
                type="date"
                value={formData.fecha_nacimiento}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* Dirección */}
          <div className="mt-4">
            <label htmlFor="direccion" className="block text-sm font-medium text-slate-300 mb-2">
              Dirección
            </label>
            <Input
              id="direccion"
              name="direccion"
              type="text"
              value={formData.direccion}
              onChange={handleChange}
              placeholder="Ej: Av. Principal 123, Comuna"
            />
          </div>
        </div>

        {/* Información Laboral */}
        <div className="bg-slate-700/40 p-4 rounded-lg border border-slate-600">
          <h3 className="text-lg font-medium text-slate-100 mb-4">Información Laboral</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Cargo */}
            <div>
              <label htmlFor="cargo" className="block text-sm font-medium text-slate-300 mb-2">
                Cargo
              </label>
              <Select
                id="cargo"
                name="cargo"
                value={formData.cargo}
                onChange={handleChange}
              >
                <option value="">Seleccionar...</option>
                <option value="Maestro Tabiquero">Maestro Tabiquero</option>
                <option value="Maestro">Maestro</option>
                <option value="Supervisor">Supervisor</option>
                <option value="Ayudante Maestro">Ayudante Maestro</option>
                <option value="Otro">Otro</option>
              </Select>

              {/* Input personalizado cuando se selecciona "Otro" */}
              {formData.cargo === 'Otro' && (
                <div className="mt-2">
                  <Input
                    id="cargo_personalizado"
                    name="cargo_personalizado"
                    type="text"
                    value={formData.cargo_personalizado || ''}
                    onChange={handleChange}
                    placeholder="Especificar cargo personalizado..."
                    className="mt-1"
                  />
                </div>
              )}
            </div>

            {/* Previsión */}
            <div>
              <label htmlFor="prevision" className="block text-sm font-medium text-slate-300 mb-2">
                Previsión (AFP)
              </label>
              <Select
                id="prevision"
                name="prevision"
                value={formData.prevision}
                onChange={handleChange}
              >
                <option value="">Seleccionar...</option>
                <option value="AFP Capital">AFP Capital</option>
                <option value="AFP Cuprum">AFP Cuprum</option>
                <option value="AFP Habitat">AFP Habitat</option>
                <option value="AFP Modelo">AFP Modelo</option>
                <option value="AFP Planvital">AFP Planvital</option>
                <option value="AFP Provida">AFP Provida</option>
                <option value="AFP Uno">AFP Uno</option>
                <option value="No tiene">No tiene</option>
              </Select>
            </div>

            {/* Salud */}
            <div>
              <label htmlFor="salud" className="block text-sm font-medium text-slate-300 mb-2">
                Sistema de Salud
              </label>
              <Select
                id="salud"
                name="salud"
                value={formData.salud}
                onChange={handleChange}
              >
                <option value="">Seleccionar...</option>
                <option value="FONASA">FONASA</option>
                <option value="ISAPRE">ISAPRE</option>
                <option value="Particular">Particular</option>
                <option value="No tiene">No tiene</option>
              </Select>
            </div>
          </div>
        </div>

        {/* Estado activo */}
        <div className="flex items-center">
          <input
            id="is_active"
            name="is_active"
            type="checkbox"
            checked={formData.is_active}
            onChange={handleChange}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-500 rounded bg-slate-700"
          />
          <label htmlFor="is_active" className="ml-2 block text-sm text-slate-300">
            Trabajador activo
          </label>
        </div>
      </div>

      {/* Botones */}
      <div className="flex justify-end space-x-3 pt-6 border-t border-slate-600">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          className="bg-blue-600 hover:bg-blue-700"
        >
          {worker ? 'Actualizar' : 'Crear'} Trabajador
        </Button>
      </div>
    </form>
  )
}

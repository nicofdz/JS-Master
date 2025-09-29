export interface WorkerContractData {
  // Datos del trabajador
  nombre_trabajador: string
  rut_trabajador: string
  direccion: string
  telefono: string
  correo: string
  ciudad: string
  nacionalidad: string
  estado: string
  fecha_nacimiento: string
  prevision: string
  salud: string
  
  // Datos del trabajo
  cargo: string
  nombre_obra: string
  fecha_inicio: string
  fecha_termino: string
}

export function formatDateToChilean(date: Date): string {
  const months = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ]
  
  const day = date.getDate()
  const month = months[date.getMonth()]
  const year = date.getFullYear()
  
  return `${day} DE ${month.toUpperCase()} DE ${year}`
}

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
  direccion_obra: string
  ciudad_obra: string
  fecha_inicio: string
  fecha_termino: string
  fecha_entrada_empresa: string // Fecha del primer contrato en la empresa/proyecto
}

// Función auxiliar para crear fechas sin problemas de zona horaria
function createLocalDate(dateString: Date | string): Date {
  // Si ya es un Date, devolverlo tal como está
  if (dateString instanceof Date) {
    return dateString
  }
  // Si es un string de fecha (YYYY-MM-DD), crear la fecha en zona local
  if (typeof dateString === 'string' && dateString.includes('-')) {
    const [year, month, day] = dateString.split('-').map(Number)
    return new Date(year, month - 1, day) // month - 1 porque los meses van de 0-11
  }
  // En cualquier otro caso, crear Date desde el string
  return new Date(dateString)
}

export function formatDateToChilean(date: Date | string): string {
  const months = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ]
  
  // Crear la fecha en zona local para evitar problemas de UTC
  const localDate = createLocalDate(date)
  
  const day = localDate.getDate()
  const month = months[localDate.getMonth()]
  const year = localDate.getFullYear()
  
  return `${day} DE ${month.toUpperCase()} DE ${year}`
}

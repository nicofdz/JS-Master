// =====================================================
// UTILIDADES PARA RUT CHILENO
// =====================================================

/**
 * Valida un RUT chileno
 * @param rut - RUT en formato string (ej: "20.610.520-8")
 * @returns true si el RUT es válido, false si no
 */
export function validateRut(rut: string): boolean {
  // Limpiar el RUT (quitar puntos y guiones)
  const cleanRut = rut.replace(/[.-]/g, '')
  
  // Verificar formato básico
  if (!/^[0-9]+[0-9kK]$/.test(cleanRut)) {
    return false
  }
  
  // Separar número y dígito verificador
  const rutNumber = cleanRut.slice(0, -1)
  const dv = cleanRut.slice(-1).toUpperCase()
  
  // Verificar que el número tenga entre 7 y 8 dígitos
  if (rutNumber.length < 7 || rutNumber.length > 8) {
    return false
  }
  
  // Calcular dígito verificador
  const calculatedDv = calculateDv(rutNumber)
  
  return calculatedDv === dv
}

/**
 * Calcula el dígito verificador de un RUT
 * @param rutNumber - Número del RUT sin dígito verificador
 * @returns Dígito verificador calculado
 */
function calculateDv(rutNumber: string): string {
  let sum = 0
  let multiplier = 2
  
  // Recorrer el RUT de derecha a izquierda
  for (let i = rutNumber.length - 1; i >= 0; i--) {
    sum += parseInt(rutNumber[i]) * multiplier
    multiplier = multiplier === 7 ? 2 : multiplier + 1
  }
  
  const remainder = sum % 11
  const dv = 11 - remainder
  
  if (dv === 11) return '0'
  if (dv === 10) return 'K'
  return dv.toString()
}

/**
 * Formatea un RUT con puntos y guión
 * @param rut - RUT sin formato (ej: "206105208")
 * @returns RUT formateado (ej: "20.610.520-8")
 */
export function formatRut(rut: string): string {
  // Limpiar el RUT
  const cleanRut = rut.replace(/[.-]/g, '')
  
  // Separar número y dígito verificador
  const rutNumber = cleanRut.slice(0, -1)
  const dv = cleanRut.slice(-1).toUpperCase()
  
  // Agregar puntos
  let formatted = rutNumber.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  
  return `${formatted}-${dv}`
}

/**
 * Limpia un RUT (quita puntos y guiones)
 * @param rut - RUT con formato
 * @returns RUT limpio
 */
export function cleanRut(rut: string): string {
  return rut.replace(/[.-]/g, '')
}

'use client'

import { useApartmentsSimple } from '@/hooks/useApartments-simple'

export default function ApartamentosTestPage() {
  const { apartments, floors, projects, loading, error } = useApartmentsSimple()

  if (loading) {
    return <div className="p-8">Cargando datos de prueba...</div>
  }

  if (error) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-red-600 mb-4">Error Detallado</h1>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-red-800 mb-2">Mensaje de Error:</h2>
          <p className="text-red-700 mb-4">{error}</p>
          
          <h2 className="text-lg font-semibold text-red-800 mb-2">Instrucciones:</h2>
          <ol className="list-decimal list-inside text-red-700 space-y-1">
            <li>Abre la consola del navegador (F12)</li>
            <li>Busca los logs que empiezan con "❌ ERROR DETALLADO"</li>
            <li>Copia y pega aquí el error completo</li>
          </ol>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Prueba de Datos</h1>
      
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
        <h2 className="text-lg font-semibold text-green-800 mb-2">✅ Estado del Sistema:</h2>
        <p className="text-green-700">Todos los datos se cargaron correctamente. Revisa la consola para ver los logs detallados.</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-2">Proyectos ({projects.length})</h2>
          <ul className="space-y-1">
            {projects.map(project => (
              <li key={project.id} className="text-sm">
                {project.id}: {project.name}
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-2">Pisos ({floors.length})</h2>
          <ul className="space-y-1">
            {floors.map(floor => (
              <li key={floor.id} className="text-sm">
                {floor.id}: Piso {floor.floor_number} (Proyecto: {floor.project_id})
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-2">Apartamentos ({apartments.length})</h2>
          <ul className="space-y-1">
            {apartments.map(apartment => (
              <li key={apartment.id} className="text-sm">
                {apartment.id}: {apartment.apartment_number} (Piso: {apartment.floor_id})
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

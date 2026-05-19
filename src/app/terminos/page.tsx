import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function Terminos() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-blue-500 selection:text-white py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-12 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Volver al Inicio
        </Link>
        
        <h1 className="text-4xl font-bold mb-8 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-300">
          Términos de Servicio
        </h1>
        
        <div className="space-y-6 text-slate-300 leading-relaxed font-light">
          <p>
            Al acceder y utilizar el sitio web de <strong>JS Master</strong>, usted acepta cumplir con los siguientes términos y condiciones de uso. Si no está de acuerdo con alguna parte de estos términos, le solicitamos abstenerse de utilizar el sitio.
          </p>
          
          <h2 className="text-2xl font-semibold text-white mt-8 font-bold">1. Uso del Sitio Web</h2>
          <p>
            El contenido de este sitio es de carácter meramente informativo sobre los servicios de construcción y terminaciones prestados por JS Master. Queda prohibida cualquier modificación, distribución o reproducción no autorizada de la información o imágenes contenidas en él.
          </p>
          
          <h2 className="text-2xl font-semibold text-white mt-8 font-bold">2. Propiedad Intelectual</h2>
          <p>
            El diseño, maquetación, gráficos, logotipos y textos del sitio son propiedad de JS Master o cuentan con las debidas licencias de uso. Cualquier uso indebido de los mismos puede constituir una violación a las leyes de propiedad intelectual.
          </p>
          
          <h2 className="text-2xl font-semibold text-white mt-8 font-bold">3. Limitación de Responsabilidad</h2>
          <p>
            Hacemos el mayor esfuerzo para que la información del sitio esté actualizada y sea precisa; sin embargo, no garantizamos que esté libre de errores u omisiones temporales. JS Master no se responsabiliza de daños derivados del uso o imposibilidad de uso del sitio.
          </p>
          
          <h2 className="text-2xl font-semibold text-white mt-8 font-bold">4. Enlaces y Medios de Contacto</h2>
          <p>
            Los enlaces a clientes de correo electrónico (`mailto:`) y llamadas (`tel:`) se proporcionan exclusivamente para facilitar la comunicación directa. El uso de estos canales para spam o comunicaciones ilícitas queda estrictamente prohibido.
          </p>
          
          <h2 className="text-2xl font-semibold text-white mt-8 font-bold">5. Modificaciones</h2>
          <p>
            JS Master se reserva el derecho de modificar estos términos de servicio en cualquier momento sin previo aviso. Le aconsejamos revisar esta página regularmente para estar al tanto de cualquier cambio.
          </p>
        </div>
      </div>
    </div>
  )
}

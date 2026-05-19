import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function Privacidad() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-blue-500 selection:text-white py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-12 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Volver al Inicio
        </Link>
        
        <h1 className="text-4xl font-bold mb-8 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-300">
          Política de Privacidad
        </h1>
        
        <div className="space-y-6 text-slate-300 leading-relaxed font-light">
          <p>
            En <strong>JS Master</strong>, nos comprometemos a proteger su privacidad. Esta Política de Privacidad describe cómo recopilamos, utilizamos y salvaguardamos su información cuando visita nuestro sitio web.
          </p>
          
          <h2 className="text-2xl font-semibold text-white mt-8 font-bold">1. Recopilación de Información</h2>
          <p>
            No recopilamos información de identificación personal en este sitio a menos que decida comunicarse con nosotros directamente a través de los canales proporcionados (correo electrónico o teléfono). La información que nos envíe se tratará de manera estrictamente confidencial.
          </p>
          
          <h2 className="text-2xl font-semibold text-white mt-8 font-bold">2. Uso de la Información</h2>
          <p>
            Cualquier dato o información de contacto que nos facilite se utilizará única y exclusivamente para:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Responder a sus consultas sobre proyectos, presupuestos o servicios.</li>
            <li>Evaluar antecedentes en caso de enviarnos postulaciones de empleo.</li>
            <li>Establecer una comunicación comercial directa y personalizada.</li>
          </ul>
          
          <h2 className="text-2xl font-semibold text-white mt-8 font-bold">3. Seguridad de los Datos</h2>
          <p>
            Implementamos medidas de seguridad para garantizar que cualquier información enviada por correo electrónico o teléfono esté resguardada contra accesos no autorizados, pérdida o alteración. No vendemos, alquilamos ni compartimos sus datos con terceros.
          </p>
          
          <h2 className="text-2xl font-semibold text-white mt-8 font-bold">4. Contacto</h2>
          <p>
            Si requiere más información sobre nuestra Política de Privacidad, puede contactarnos a:
          </p>
          <ul className="list-none space-y-1">
            <li><strong>Email:</strong> jsandoval0696@gmail.com</li>
            <li><strong>Teléfono:</strong> +56 9 7150 7575</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

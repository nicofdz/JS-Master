'use client'

import { useState } from 'react'
import { useFormStatus } from 'react-dom'
import { submitServiceRequest } from '@/lib/actions/service-requests'
import { CheckCircle2, Send, Building, User, Mail, Phone, MapPin, Briefcase } from 'lucide-react'
import { RevealOnScroll } from './RevealOnScroll'

function SubmitButton() {
    const { pending } = useFormStatus()

    return (
        <button
            type="submit"
            disabled={pending}
            className="w-full inline-flex items-center justify-center px-8 py-4 border border-transparent text-base font-bold rounded-xl text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all shadow-lg hover:shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed group"
        >
            {pending ? (
                <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Enviando Solicitud...
                </span>
            ) : (
                <span className="flex items-center">
                    Solicitar Presupuesto
                    <Send className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </span>
            )}
        </button>
    )
}

export function ServiceRequestForm() {
    const [submitted, setSubmitted] = useState(false)
    const [error, setError] = useState<string | null>(null)

    async function clientAction(formData: FormData) {
        const result = await submitServiceRequest({}, formData)
        if (result.success) {
            setSubmitted(true)
            setError(null)
        } else {
            setError(result.message || "Error desconocido")
        }
    }

    if (submitted) {
        return (
            <section className="py-24 bg-slate-950 border-t border-slate-900 relative overflow-hidden" id="contrata-servicios">
                <div className="max-w-4xl mx-auto px-4 relative z-10 text-center">
                    <div className="w-24 h-24 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-8 animate-in zoom-in duration-500">
                        <CheckCircle2 className="w-12 h-12 text-blue-500" />
                    </div>
                    <h2 className="text-4xl font-bold text-white mb-4">¡Solicitud Enviada!</h2>
                    <p className="text-slate-300 text-lg mb-8 max-w-2xl mx-auto">
                        Hemos recibido los detalles de tu proyecto. Uno de nuestros expertos comerciales te contactará a la brevedad para coordinar una evaluación.
                    </p>
                    <button
                        onClick={() => setSubmitted(false)}
                        className="text-blue-400 hover:text-blue-300 font-medium underline underline-offset-4"
                    >
                        Enviar otra solicitud
                    </button>
                </div>
            </section>
        )
    }

    return (
        <section className="py-24 bg-slate-950 border-t border-slate-900 relative overflow-hidden" id="contrata-servicios">
            {/* Background Decor */}
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/10 via-slate-950 to-slate-950"></div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="text-center mb-16">
                    <RevealOnScroll>
                        <span className="text-blue-500 font-bold tracking-widest uppercase text-xs mb-2 block">Cotiza con Expertos</span>
                        <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">Inicia tu Proyecto</h2>
                        <p className="text-lg text-slate-400 max-w-2xl mx-auto">
                            Cuéntanos qué necesitas y diseñaremos una solución a medida para tus terminaciones.
                        </p>
                    </RevealOnScroll>
                </div>

                <div className="max-w-3xl mx-auto">
                    <RevealOnScroll delay={100}>
                        <div className="bg-slate-900/50 p-8 md:p-10 rounded-3xl border border-slate-800 shadow-2xl backdrop-blur-sm">
                            <form action={clientAction} className="space-y-6">

                                {/* Company & Contact */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="relative">
                                        <label className="block text-sm font-medium text-slate-400 mb-2">Empresa (Opcional)</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                                                <Building className="w-5 h-5" />
                                            </div>
                                            <input
                                                type="text"
                                                name="company_name"
                                                placeholder="Nombre de tu empresa"
                                                className="block w-full pl-10 pr-3 py-3 border border-slate-700/50 rounded-xl leading-5 bg-slate-800/50 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-all"
                                            />
                                        </div>
                                    </div>

                                    <div className="relative">
                                        <label className="block text-sm font-medium text-slate-400 mb-2">Persona de Contacto</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                                                <User className="w-5 h-5" />
                                            </div>
                                            <input
                                                type="text"
                                                name="contact_name"
                                                required
                                                placeholder="Tu nombre completo"
                                                className="block w-full pl-10 pr-3 py-3 border border-slate-700/50 rounded-xl leading-5 bg-slate-800/50 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-all"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Contact Details */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="relative">
                                        <label className="block text-sm font-medium text-slate-400 mb-2">Email Corporativo</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                                                <Mail className="w-5 h-5" />
                                            </div>
                                            <input
                                                type="email"
                                                name="email"
                                                required
                                                placeholder="nombre@empresa.com"
                                                className="block w-full pl-10 pr-3 py-3 border border-slate-700/50 rounded-xl leading-5 bg-slate-800/50 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-all"
                                            />
                                        </div>
                                    </div>

                                    <div className="relative">
                                        <label className="block text-sm font-medium text-slate-400 mb-2">Teléfono</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                                                <Phone className="w-5 h-5" />
                                            </div>
                                            <input
                                                type="tel"
                                                name="phone"
                                                required
                                                placeholder="+56 9 ..."
                                                className="block w-full pl-10 pr-3 py-3 border border-slate-700/50 rounded-xl leading-5 bg-slate-800/50 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-all"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Project Details */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="relative">
                                        <label className="block text-sm font-medium text-slate-400 mb-2">Tipo de Proyecto</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                                                <Briefcase className="w-5 h-5" />
                                            </div>
                                            <select
                                                name="project_type"
                                                className="block w-full pl-10 pr-3 py-3 border border-slate-700/50 rounded-xl leading-5 bg-slate-800/50 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-all appearance-none"
                                            >
                                                <option value="">Selecciona tipo...</option>
                                                <option value="residencial">Edificación Residencial</option>
                                                <option value="oficinas">Habilitación de Oficinas</option>
                                                <option value="comercial">Local Comercial / Retail</option>
                                                <option value="industrial">Industrial</option>
                                                <option value="otro">Otro</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="relative">
                                        <label className="block text-sm font-medium text-slate-400 mb-2">Ubicación / Comuna</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                                                <MapPin className="w-5 h-5" />
                                            </div>
                                            <input
                                                type="text"
                                                name="location"
                                                placeholder="Ej: Las Condes, Santiago"
                                                className="block w-full pl-10 pr-3 py-3 border border-slate-700/50 rounded-xl leading-5 bg-slate-800/50 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-all"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="relative">
                                    <label className="block text-sm font-medium text-slate-400 mb-2">Detalles del Proyecto</label>
                                    <textarea
                                        name="message"
                                        rows={4}
                                        placeholder="Descríbenos brevemente el alcance, metros cuadrados aproximados o requerimientos especiales..."
                                        className="block w-full px-4 py-3 border border-slate-700/50 rounded-xl leading-5 bg-slate-800/50 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-all resize-none"
                                    ></textarea>
                                </div>

                                {error && (
                                    <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-200 text-sm">
                                        {error}
                                    </div>
                                )}

                                <SubmitButton />
                            </form>
                        </div>
                    </RevealOnScroll>
                </div>
            </div>
        </section>
    )
}

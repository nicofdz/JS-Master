'use client'

import { useState } from 'react'
import { useFormStatus } from 'react-dom'
import { submitApplication } from '@/lib/actions/applications'
import { CheckCircle2, Send, HardHat, Briefcase, User, Mail, Phone, Clock, ShieldCheck } from 'lucide-react'
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
                    Enviando...
                </span>
            ) : (
                <span className="flex items-center">
                    Enviar Postulación
                    <Send className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </span>
            )}
        </button>
    )
}

export function WorkWithUs() {
    const [submitted, setSubmitted] = useState(false)
    const [error, setError] = useState<string | null>(null)

    async function clientAction(formData: FormData) {
        const result = await submitApplication({}, formData)
        if (result.success) {
            setSubmitted(true)
            setError(null)
        } else {
            setError(result.message || "Error desconocido")
        }
    }

    if (submitted) {
        return (
            <section className="py-24 bg-slate-900 border-y border-slate-800 relative overflow-hidden" id="trabaja-con-nosotros">
                <div className="max-w-4xl mx-auto px-4 relative z-10 text-center">
                    <div className="w-24 h-24 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-8 animate-in zoom-in duration-500">
                        <CheckCircle2 className="w-12 h-12 text-green-500" />
                    </div>
                    <h2 className="text-4xl font-bold text-white mb-4">¡Postulación Recibida!</h2>
                    <p className="text-slate-300 text-lg mb-8 max-w-2xl mx-auto">
                        Gracias por tu interés en unirte a JS Master. Hemos guardado tus datos correctamente.
                        Nuestro equipo revisará tus antecedentes y te contactaremos si surge una vacante acorde a tu perfil.
                    </p>
                    <button
                        onClick={() => setSubmitted(false)}
                        className="text-blue-400 hover:text-blue-300 font-medium underline underline-offset-4"
                    >
                        Enviar otra postulación
                    </button>
                </div>
            </section>
        )
    }

    return (
        <section className="py-24 bg-slate-900 border-y border-slate-800 relative overflow-hidden" id="trabaja-con-nosotros">
            {/* Background Decor */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-blue-900/5 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-cyan-900/5 rounded-full blur-3xl"></div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="grid lg:grid-cols-2 gap-16 items-center">

                    {/* Info Column */}
                    <div className="lg:pr-8">
                        <RevealOnScroll>
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium mb-6">
                                <Briefcase className="w-4 h-4" />
                                <span>Bolsa de Trabajo</span>
                            </div>
                            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
                                Únete al Equipo de <span className="text-blue-500">Expertos</span>
                            </h2>
                            <p className="text-slate-400 text-lg leading-relaxed mb-8">
                                En JS Master siempre buscamos talento comprometido con la excelencia. Si tienes experiencia en terminaciones, pintura, tabiquería o carpintería fina, queremos conocerte.
                            </p>

                            <div className="space-y-6">
                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-blue-400 flex-shrink-0 mt-1">
                                        <HardHat className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-white font-bold mb-1">Crecimiento Profesional</h3>
                                        <p className="text-slate-400 text-sm">Oportunidades reales de desarrollo en obras de alto estándar.</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-blue-400 flex-shrink-0 mt-1">
                                        <User className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-white font-bold mb-1">Ambiente de Respeto</h3>
                                        <p className="text-slate-400 text-sm">Valoramos el trabajo bien hecho y el trato digno en cada proyecto.</p>
                                    </div>
                                </div>
                            </div>
                        </RevealOnScroll>
                    </div>

                    {/* Form Column */}
                    <RevealOnScroll delay={200}>
                        <div className="bg-slate-950 p-8 rounded-3xl border border-slate-800 shadow-2xl relative">
                            <h3 className="text-2xl font-bold text-white mb-6">Déjanos tus datos</h3>

                            <form action={clientAction} className="space-y-5">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                                            <User className="w-5 h-5" />
                                        </div>
                                        <input
                                            type="text"
                                            name="full_name"
                                            required
                                            placeholder="Nombre Completo"
                                            className="block w-full pl-10 pr-3 py-3 border border-slate-800 rounded-xl leading-5 bg-slate-900 text-slate-300 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-all"
                                        />
                                    </div>

                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                                            <ShieldCheck className="w-5 h-5" />
                                        </div>
                                        <input
                                            type="text"
                                            name="rut"
                                            required
                                            placeholder="RUT (ej: 12.345.678-9)"
                                            className="block w-full pl-10 pr-3 py-3 border border-slate-800 rounded-xl leading-5 bg-slate-900 text-slate-300 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-all"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                                            <Mail className="w-5 h-5" />
                                        </div>
                                        <input
                                            type="email"
                                            name="email"
                                            required
                                            placeholder="Correo Electrónico"
                                            className="block w-full pl-10 pr-3 py-3 border border-slate-800 rounded-xl leading-5 bg-slate-900 text-slate-300 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-all"
                                        />
                                    </div>

                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                                            <Phone className="w-5 h-5" />
                                        </div>
                                        <input
                                            type="tel"
                                            name="phone"
                                            required
                                            placeholder="Teléfono (+569...)"
                                            className="block w-full pl-10 pr-3 py-3 border border-slate-800 rounded-xl leading-5 bg-slate-900 text-slate-300 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-all"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                                            <Clock className="w-5 h-5" />
                                        </div>
                                        <input
                                            type="number"
                                            name="experience_years"
                                            min="0"
                                            max="50"
                                            placeholder="Años de experiencia"
                                            className="block w-full pl-10 pr-3 py-3 border border-slate-800 rounded-xl leading-5 bg-slate-900 text-slate-300 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-all"
                                        />
                                    </div>

                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                                            <HardHat className="w-5 h-5" />
                                        </div>
                                        <select
                                            name="specialization"
                                            required
                                            className="block w-full pl-10 pr-3 py-3 border border-slate-800 rounded-xl leading-5 bg-slate-900 text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-all appearance-none"
                                        >
                                            <option value="">Selecciona Especialidad</option>
                                            <option value="maestro_pintor">Maestro Pintor</option>
                                            <option value="maestro_yesero">Maestro Yesero</option>
                                            <option value="maestro_carpintero">Maestro Carpintero</option>
                                            <option value="tabiquero">Tabiquero</option>
                                            <option value="ayudante">Ayudante Avanzado</option>
                                            <option value="jornal">Jornal</option>
                                            <option value="otro">Otro</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="relative">
                                    <textarea
                                        name="message"
                                        rows={3}
                                        placeholder="Cuéntanos brevemente sobre tu experiencia (proyectos recientes, herramientas que manejas, etc.)"
                                        className="block w-full px-4 py-3 border border-slate-800 rounded-xl leading-5 bg-slate-900 text-slate-300 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-all resize-none"
                                    ></textarea>
                                </div>

                                {error && (
                                    <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-200 text-sm">
                                        {error}
                                    </div>
                                )}

                                <SubmitButton />

                                <p className="text-center text-xs text-slate-500 mt-4">
                                    * Tus datos serán almacenados de forma segura y usados solo para procesos de selección internos.
                                </p>
                            </form>
                        </div>
                    </RevealOnScroll>
                </div>
            </div>
        </section>
    )
}

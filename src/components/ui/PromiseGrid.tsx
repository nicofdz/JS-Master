'use client'

import { CheckCircle2, Clock, ShieldCheck, Ruler, Sparkles, HardHat } from 'lucide-react'
import { RevealOnScroll } from './RevealOnScroll'

const features = [
    {
        icon: <Ruler className="w-6 h-6" />,
        title: "Precisión Milimétrica",
        description: "Cada corte, cada ángulo y cada unión se ejecuta con estándares de tolerancia cero. No aceptamos 'más o menos', solo perfecto."
    },
    {
        icon: <Clock className="w-6 h-6" />,
        title: "Plazos Garantizados",
        description: "Entendemos que el tiempo es dinero. Trabajamos con cronogramas estrictos para asegurar entregas en la fecha acordada, sin excusas."
    },
    {
        icon: <Sparkles className="w-6 h-6" />,
        title: "Entrega 'Llave en Mano'",
        description: "Limpieza profunda final incluida. Recibe tu obra impecable, libre de escombros y lista para ser habitada o utilizada de inmediato."
    },
    {
        icon: <ShieldCheck className="w-6 h-6" />,
        title: "Garantía Real",
        description: "Respaldamos nuestro trabajo. Si surge algún detalle posterior a la entrega, nuestro equipo de post-venta responde con prioridad."
    },
    {
        icon: <HardHat className="w-6 h-6" />,
        title: "Supervisión Constante",
        description: "Jefes de obra presentes en terreno. Controlamos la calidad paso a paso, no solo al final, para prevenir errores antes de que ocurran."
    },
    {
        icon: <CheckCircle2 className="w-6 h-6" />,
        title: "Materiales Certificados",
        description: "Solo utilizamos insumos de marcas líderes y probada durabilidad. Un buen acabado comienza con una buena base."
    }
]

export function PromiseGrid() {
    return (
        <section className="py-24 relative overflow-hidden">
            {/* Background Elements to match the dark aesthetic */}
            <div className="absolute inset-0 bg-slate-950"></div>
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-900/10 rounded-full blur-3xl opacity-50"></div>
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-cyan-900/10 rounded-full blur-3xl opacity-50"></div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="grid lg:grid-cols-12 gap-12 items-start">

                    {/* Header Section (Left detailed column in desktop) */}
                    <div className="lg:col-span-4 sticky top-24">
                        <RevealOnScroll>
                            <div className="pl-4 border-l-4 border-blue-500 mb-6">
                                <span className="text-blue-400 font-bold tracking-widest uppercase text-xs">
                                    ¿Por qué JS Master?
                                </span>
                                <h2 className="text-4xl font-bold text-white mt-2 leading-tight">
                                    Conoce nuestras <br />
                                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
                                        diferencias
                                    </span>
                                </h2>
                            </div>

                            <p className="text-slate-400 text-lg leading-relaxed mb-8">
                                No somos una constructora más. Somos especialistas en el detalle final, esa etapa crítica que define la calidad de tu inversión.
                            </p>


                        </RevealOnScroll>
                    </div>

                    {/* Grid Section (Right columns) */}
                    <div className="lg:col-span-8">
                        <div className="grid md:grid-cols-2 gap-6">
                            {features.map((feature, index) => (
                                <RevealOnScroll key={index} delay={index * 100}>
                                    <div className="group h-full p-8 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-blue-500/30 transition-all duration-300 hover:bg-slate-800 hover:shadow-xl hover:shadow-blue-900/10 hover:-translate-y-1">
                                        <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 mb-6 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">
                                            {feature.icon}
                                        </div>
                                        <h3 className="text-xl font-bold text-white mb-3 group-hover:text-blue-200 transition-colors">
                                            {feature.title}
                                        </h3>
                                        <p className="text-slate-400 text-sm leading-relaxed group-hover:text-slate-300 transition-colors">
                                            {feature.description}
                                        </p>
                                    </div>
                                </RevealOnScroll>
                            ))}
                        </div>


                    </div>

                </div>
            </div>
        </section>
    )
}

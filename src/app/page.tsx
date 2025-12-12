'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Hammer, CheckCircle2, Building, ShieldCheck, Ruler, PaintBucket, Users, Trophy } from 'lucide-react'
import { RevealOnScroll } from '@/components/ui/RevealOnScroll'
import { CountUpAnimation } from '@/components/ui/CountUp'
import { PromiseGrid } from '@/components/ui/PromiseGrid'
import { WorkWithUs } from '@/components/ui/WorkWithUs'
import { ServiceRequestForm } from '@/components/ui/ServiceRequestForm'

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-blue-500 selection:text-white overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <Link href="/" className="flex items-center gap-3 group cursor-pointer">
              <div className="relative w-12 h-12 group-hover:scale-105 transition-transform">
                <Image
                  src="/logo/logo jsmaster.png"
                  alt="JS Master Logo"
                  fill
                  className="object-contain"
                />
              </div>
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-300 tracking-wide group-hover:opacity-80 transition-opacity">
                JS MASTER
              </span>
            </Link>
            <div className="hidden md:flex items-center gap-2 lg:gap-6">
              <Link href="#servicios" className="text-sm font-medium text-slate-300 hover:text-white transition-colors hover:scale-105 transform">
                Servicios
              </Link>
              <Link href="#experiencia" className="text-sm font-medium text-slate-300 hover:text-white transition-colors hover:scale-105 transform">
                Trayectoria
              </Link>
              <Link href="#contacto" className="text-sm font-medium text-slate-300 hover:text-white transition-colors hover:scale-105 transform">
                Contacto
              </Link>

              <div className="w-px h-5 bg-slate-800 mx-2"></div>

              <Link
                href="#contrata-servicios"
                className="text-sm font-medium text-slate-300 hover:text-white transition-colors hover:scale-105 transform"
              >
                Contratar Servicios
              </Link>
              <Link
                href="#trabaja-con-nosotros"
                className="text-sm font-medium text-slate-300 hover:text-white transition-colors hover:scale-105 transform"
              >
                Trabaja con Nosotros
              </Link>
            </div>
            <div className="ml-4">
              <Link
                href="/login"
                className="inline-flex items-center px-5 py-2.5 border border-transparent text-sm font-medium rounded-full text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-blue-500 transition-all shadow-lg shadow-blue-500/20 hover:scale-105"
              >
                Iniciar Sesión
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden min-h-screen flex items-center">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1621905251189-08b45d6a269e?q=80&w=2069&auto=format&fit=crop')] bg-cover bg-center opacity-50 parallax-bg"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/70 via-slate-950/80 to-slate-950"></div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center z-10">
          <RevealOnScroll>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-900/30 border border-blue-500/30 text-blue-400 mb-8 backdrop-blur-sm">
              <Trophy className="w-4 h-4" />
              <span className="text-sm font-medium">Excelencia en Construcción y Terminaciones</span>
            </div>
          </RevealOnScroll>

          <RevealOnScroll delay={200}>
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tight mb-8 leading-tight">
              <span className="block text-slate-100 drop-shadow-lg">Construimos</span>
              <span className="block mt-2 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 drop-shadow-lg pb-4">
                Su Visión
              </span>
            </h1>
          </RevealOnScroll>

          <RevealOnScroll delay={400}>
            <p className="mt-6 max-w-2xl mx-auto text-xl md:text-2xl text-slate-300 leading-relaxed font-light">
              Especialistas en transformar espacios con <strong className="text-white font-semibold">precisión milimétrica</strong>.
              Fusionamos <strong className="text-white font-semibold">30 años</strong> de maestría técnica con gestión moderna para entregar resultados que superan expectativas.
            </p>
          </RevealOnScroll>

          <RevealOnScroll delay={600} className="mt-12 flex flex-col sm:flex-row justify-center gap-4">
            <Link
              href="#contrata-servicios"
              className="inline-flex items-center justify-center px-8 py-4 border border-transparent text-base font-bold rounded-xl text-white bg-blue-600 hover:bg-blue-700 transition-all hover:scale-105 shadow-xl shadow-blue-500/20 group"
            >
              Contrata nuestros servicios
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="#servicios"
              className="inline-flex items-center justify-center px-8 py-4 border border-slate-700 text-base font-bold rounded-xl text-slate-300 hover:bg-slate-800 transition-all hover:text-white hover:border-slate-600"
            >
              Explorar Servicios
            </Link>
          </RevealOnScroll>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 border-2 border-slate-500 rounded-full flex justify-center pt-2">
            <div className="w-1 h-3 bg-blue-500 rounded-full"></div>
          </div>
        </div>
      </section>

      {/* Experience Section */}
      <section id="experiencia" className="py-24 bg-slate-900/30 border-y border-slate-800 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <RevealOnScroll>
            <div className="text-center mb-20">
              <span className="text-blue-500 font-bold tracking-widest uppercase text-xs mb-2 block">Nuestra Historia</span>
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">Trayectoria Comprobada</h2>
              <p className="text-lg text-slate-400 max-w-3xl mx-auto">
                JS Master combina la solidez de una empresa establecida con la experiencia inigualable de sus fundadores.
              </p>
            </div>
          </RevealOnScroll>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <RevealOnScroll delay={100} className="h-full">
              <div className="p-8 rounded-3xl bg-slate-800/40 border border-slate-700 hover:border-blue-500/40 transition-all hover:shadow-2xl hover:shadow-blue-500/10 group h-full hover:-translate-y-2 duration-300">
                <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-400 mb-6 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-500">
                  <Building className="w-8 h-8" />
                </div>
                <h3 className="text-5xl font-bold text-white mb-2 flex items-baseline">
                  +<CountUpAnimation target={3} duration={1500} />
                </h3>
                <p className="text-lg font-semibold text-slate-200 mb-4">Años como Empresa Consolidada</p>
                <p className="text-slate-400 leading-relaxed text-sm">
                  Operando bajo el nombre JS Master, hemos ejecutado múltiples proyectos exitosos, estableciendo un estándar de cumplimiento.
                </p>
              </div>
            </RevealOnScroll>

            <RevealOnScroll delay={300} className="h-full">
              <div className="p-8 rounded-3xl bg-gradient-to-br from-blue-900/20 to-slate-900/80 border border-blue-500/50 relative overflow-hidden group shadow-2xl shadow-blue-900/20 h-full hover:scale-105 transition-transform duration-500">
                <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl group-hover:bg-blue-500/30 transition-colors"></div>
                <div className="relative z-10">
                  <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white mb-6 shadow-lg shadow-blue-500/30 group-hover:rotate-6 transition-transform">
                    <ShieldCheck className="w-8 h-8" />
                  </div>
                  <h3 className="text-6xl font-extrabold text-white mb-2 flex items-baseline tracking-tight">
                    <CountUpAnimation target={30} duration={2000} />
                  </h3>
                  <p className="text-xl font-bold text-blue-100 mb-4">Años de Experiencia del Fundador</p>
                  <p className="text-blue-200/80 leading-relaxed text-sm">
                    Tres décadas de trabajo ininterrumpido en el rubro. Un legado de conocimiento técnico profundo en cada fase.
                  </p>
                </div>
              </div>
            </RevealOnScroll>

            <RevealOnScroll delay={500} className="h-full">
              <div className="p-8 rounded-3xl bg-slate-800/40 border border-slate-700 hover:border-blue-500/40 transition-all hover:shadow-2xl hover:shadow-blue-500/10 group h-full hover:-translate-y-2 duration-300">
                <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-400 mb-6 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-500">
                  <Users className="w-8 h-8" />
                </div>
                <h3 className="text-5xl font-bold text-white mb-2">100%</h3>
                <p className="text-lg font-semibold text-slate-200 mb-4">Equipo Calificado</p>
                <p className="text-slate-400 leading-relaxed text-sm">
                  Cuadrillas especializadas en tabiquería y carpintería, dirigidas por supervisores con amplia experiencia.
                </p>
              </div>
            </RevealOnScroll>
          </div>
        </div>
      </section>

      {/* Promise Section */}
      <PromiseGrid />


      {/* Services Section */}
      <section id="servicios" className="py-32 relative overflow-hidden bg-slate-950">
        <div className="absolute top-0 left-0 w-full h-full bg-slate-950/80 z-0"></div>
        <div className="absolute -left-20 top-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl"></div>
        <div className="absolute -right-20 bottom-40 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <RevealOnScroll>
            <div className="text-center mb-24">
              <span className="text-blue-500 font-semibold tracking-wider uppercase text-sm border-b border-blue-500/30 pb-1">Nuestras Especialidades</span>
              <h2 className="text-4xl md:text-6xl font-bold text-white mt-6 mb-6">Soluciones Integrales</h2>
              <p className="text-xl text-slate-400 max-w-3xl mx-auto font-light">
                Cada servicio es ejecutado con materiales de primera y técnicas perfeccionadas para garantizar durabilidad y estética.
              </p>
            </div>
          </RevealOnScroll>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <ServiceCard
              icon={<Hammer />}
              title="Tabiquería"
              description="Instalación profesional de sistemas de tabiquería en seco (Metalcon, Volcometal). Soluciones acústicas, térmicas y resistentes al fuego."
              delay={0}
            />
            <ServiceCard
              icon={<PaintBucket />}
              title="Terminaciones"
              description="Especialistas en terminaciones de puertas, guardapolvos y cornisas. Acabados precisos que realzan la estética de cada espacio."
              delay={150}
            />
            <ServiceCard
              icon={<Building />}
              title="Puertas"
              description="Montaje experto de puertas de abatir, correderas y vaivén. Instalación precisa de marcos, quincallería y ajustes finales."
              delay={300}
            />
            <ServiceCard
              icon={<Ruler />}
              title="Guardapolvos"
              description="Instalación de guardapolvos, junquillos y molduras decorativas. Cortes a inglete perfectos y fijaciones invisibles."
              delay={450}
            />
          </div>
        </div>
      </section>

      {/* Hire Services Section */}
      <ServiceRequestForm />

      {/* CTA Section */}
      <section className="py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-blue-900/20"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/40 via-slate-950/80 to-slate-950"></div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <RevealOnScroll className="flex flex-col items-center">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-8 leading-tight">Llevando el Control de Obra <br />al <span className="text-blue-400">Siguiente Nivel</span></h2>
            <p className="text-xl text-blue-100/70 mb-12 max-w-3xl mx-auto">
              Utilizamos tecnología avanzada para gestionar nuestros proyectos, asegurando transparencia, trazabilidad y eficiencia en cada entrega.
            </p>
            <Link
              href="#trabaja-con-nosotros"
              className="group relative inline-flex items-center px-12 py-5 bg-white text-blue-950 font-bold text-lg rounded-full hover:bg-blue-50 transition-all shadow-2xl hover:shadow-white/20 hover:-translate-y-1 overflow-hidden"
            >
              <span className="relative z-10">Trabaja con nosotros</span>
              <div className="absolute inset-0 bg-gradient-to-r from-blue-100 to-white opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </Link>
          </RevealOnScroll>
        </div>
      </section>

      {/* Work With Us Section */}
      <WorkWithUs />

      {/* Footer */}
      <footer id="contacto" className="bg-slate-950 py-16 border-t border-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
            <div>
              <div className="flex items-center gap-2 mb-6">
                <div className="relative w-8 h-8">
                  <Image
                    src="/logo/logo jsmaster.png"
                    alt="JS Master Logo"
                    fill
                    className="object-contain"
                  />
                </div>
                <span className="text-xl font-bold text-white">JS MASTER</span>
              </div>
              <p className="text-slate-500 leading-relaxed text-sm">
                Expertos en terminaciones y construcción con un legado de calidad y compromiso.
              </p>
            </div>

            <div>
              <h4 className="text-white font-bold mb-6">Servicios</h4>
              <ul className="space-y-3 text-slate-500 text-sm">
                <li className="hover:text-blue-400 transition-colors cursor-pointer">Tabiquería</li>
                <li className="hover:text-blue-400 transition-colors cursor-pointer">Terminaciones</li>
                <li className="hover:text-blue-400 transition-colors cursor-pointer">Instalación de Puertas</li>
                <li className="hover:text-blue-400 transition-colors cursor-pointer">Guardapolvos y Molduras</li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-bold mb-6">Empresa</h4>
              <ul className="space-y-3 text-slate-500 text-sm">
                <li className="hover:text-blue-400 transition-colors cursor-pointer">Sobre Nosotros</li>
                <li className="hover:text-blue-400 transition-colors cursor-pointer">Trayectoria</li>
                <li className="hover:text-blue-400 transition-colors cursor-pointer">Proyectos</li>
                <li className="hover:text-blue-400 transition-colors cursor-pointer">Contacto</li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-bold mb-6">Contacto</h4>
              <ul className="space-y-4 text-sm">
                <li className="flex items-center text-slate-500 group cursor-pointer hover:text-blue-400 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mr-3 group-hover:bg-blue-600 group-hover:text-white transition-all">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                  </div>
                  contacto@jsmaster.cl
                </li>
                <li className="flex items-center text-slate-500 group cursor-pointer hover:text-blue-400 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mr-3 group-hover:bg-blue-600 group-hover:text-white transition-all">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                  </div>
                  +56 9 1234 5678
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-900 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-slate-600 text-sm">
              &copy; {new Date().getFullYear()} JS Master Construcción. Todos los derechos reservados.
            </div>
            <div className="flex gap-6">
              <span className="text-slate-600 hover:text-slate-400 cursor-pointer text-sm">Privacidad</span>
              <span className="text-slate-600 hover:text-slate-400 cursor-pointer text-sm">Términos</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

function ServiceCard({ icon, title, description, delay }: { icon: React.ReactNode, title: string, description: string, delay: number }) {
  return (
    <RevealOnScroll delay={delay} className="h-full">
      <div className="group p-8 rounded-3xl bg-slate-900/50 border border-slate-800 hover:border-blue-500/50 hover:bg-slate-800 transition-all duration-300 hover:-translate-y-2 h-full flex flex-col">
        <div className="w-14 h-14 bg-slate-800 rounded-2xl flex items-center justify-center text-blue-500 mb-6 group-hover:bg-blue-600 group-hover:text-white transition-all duration-500 shadow-lg group-hover:shadow-blue-500/25 group-hover:rotate-3">
          {icon}
        </div>
        <h3 className="text-2xl font-bold text-white mb-3 group-hover:text-blue-400 transition-colors">{title}</h3>
        <p className="text-slate-400 group-hover:text-slate-300 transition-colors leading-relaxed font-light flex-grow">{description}</p>
        <div className="mt-6 flex items-center text-blue-500 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-[-10px] group-hover:translate-x-0">
          Saber más <ArrowRight className="ml-1 w-4 h-4" />
        </div>
      </div>
    </RevealOnScroll>
  )
}

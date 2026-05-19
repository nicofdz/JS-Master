'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent } from '@/components/ui/Card'
import { Printer, Mail, Phone, Globe, CreditCard, LayoutGrid, Check, Sparkles, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'

// Mock QR Code Component
const MockQRCode = () => (
  <svg viewBox="0 0 100 100" className="w-16 h-16 text-slate-800 dark:text-slate-200">
    <rect width="100" height="100" fill="transparent" />
    <path d="M 0 0 L 25 0 L 25 5 L 5 5 L 5 25 L 0 25 Z" fill="currentColor" />
    <path d="M 75 0 L 100 0 L 100 25 L 95 25 L 95 5 L 75 5 Z" fill="currentColor" />
    <path d="M 0 75 L 0 100 L 25 100 L 25 95 L 5 95 L 5 75 Z" fill="currentColor" />
    <rect x="5" y="5" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="3" />
    <rect x="10" y="10" width="5" height="5" fill="currentColor" />
    <rect x="75" y="5" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="3" />
    <rect x="80" y="10" width="5" height="5" fill="currentColor" />
    <rect x="5" y="75" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="3" />
    <rect x="10" y="80" width="5" height="5" fill="currentColor" />
    <path d="M 30 10 H 35 V 20 H 45 V 30 H 40 V 35 H 30 Z" fill="currentColor" />
    <path d="M 50 5 H 55 V 15 H 65 V 20 H 50 Z" fill="currentColor" />
    <path d="M 30 50 H 40 V 60 H 35 V 70 H 30 Z" fill="currentColor" />
    <path d="M 60 50 H 70 V 55 H 80 V 65 H 75 V 70 H 60 Z" fill="currentColor" />
    <path d="M 80 80 H 90 V 90 H 80 Z" fill="currentColor" />
    <path d="M 50 80 H 55 V 90 H 50 Z" fill="currentColor" />
    <path d="M 5 50 H 15 V 55 H 5 Z" fill="currentColor" />
    <path d="M 50 35 H 60 V 45 H 50 Z" fill="currentColor" />
  </svg>
)

export default function TarjetaPresentacionPage() {
  const { profile, loading: authLoading } = useAuth()
  const router = useRouter()

  // Form State
  const [nombre, setNombre] = useState('Jorge Sandoval')
  const [cargo, setCargo] = useState('Fundador & Director General')
  const [telefono, setTelefono] = useState('+56 9 7150 7575')
  const [email, setEmail] = useState('jsandoval0696@gmail.com')
  const [web, setWeb] = useState('jsmaster.cl')
  
  // Design Options
  const [darkMode, setDarkMode] = useState(true)
  const [accentColor, setAccentColor] = useState<'gold' | 'blue' | 'silver'>('gold')

  // Route protection
  useEffect(() => {
    if (!authLoading && profile && profile.role !== 'admin') {
      toast.error('Acceso denegado')
      router.push('/dashboard')
    }
  }, [profile, authLoading, router])

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (profile?.role !== 'admin') return null

  const handlePrint = () => {
    window.print()
  }

  const getAccentClass = () => {
    switch (accentColor) {
      case 'gold':
        return 'from-amber-400 to-yellow-600'
      case 'blue':
        return 'from-blue-500 to-cyan-400'
      case 'silver':
        return 'from-slate-300 to-slate-500'
    }
  }

  const getAccentBorderClass = () => {
    switch (accentColor) {
      case 'gold':
        return 'border-amber-500/30'
      case 'blue':
        return 'border-blue-500/30'
      case 'silver':
        return 'border-slate-500/30'
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      {/* CSS overrides for print */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          /* Hide everything except print layout */
          header, footer, nav, aside, button, .no-print, .notification-center {
            display: none !important;
          }
          /* Reset root layout paddings for print */
          body, html, main, .min-h-screen, [class*="lg:pl-"] {
            background: white !important;
            color: black !important;
            margin: 0 !important;
            padding: 0 !important;
            padding-left: 0 !important;
          }
          .print-container {
            display: flex !important;
            flex-direction: column !important;
            gap: 40px !important;
            align-items: center !important;
            justify-content: center !important;
            min-height: 100vh !important;
            background: white !important;
            padding: 20px !important;
          }
          .business-card-print {
            width: 88.9mm !important; /* Standard 3.5in */
            height: 50.8mm !important; /* Standard 2in */
            position: relative !important;
            box-sizing: border-box !important;
            border: 1px solid #d1d5db !important;
            border-radius: 0px !important;
            box-shadow: none !important;
            background: ${darkMode ? '#0b0f19' : '#ffffff'} !important;
            color: ${darkMode ? '#f8fafc' : '#0f172a'} !important;
            page-break-inside: avoid !important;
            overflow: hidden !important;
            print-color-adjust: exact !important;
            -webkit-print-color-adjust: exact !important;
          }
          .print-glow {
            display: none !important;
          }
        }
      ` }} />

      <div className="max-w-7xl mx-auto space-y-6 no-print">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-amber-500/20">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Tarjetas de Presentación</h1>
              <p className="text-slate-400">Genera y personaliza tu tarjeta corporativa para impresión física o digital</p>
            </div>
          </div>
          <Button
            className="bg-amber-500 hover:bg-amber-600 text-white font-semibold"
            onClick={handlePrint}
          >
            <Printer className="w-4 h-4 mr-2" />
            Imprimir Tarjetas
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Editor Form */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-6 space-y-6">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2 border-b border-slate-700 pb-3">
                  <Sparkles className="w-5 h-5 text-amber-500" />
                  Personalizar Datos
                </h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Nombre Completo</label>
                    <Input
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      className="bg-slate-900/50 border-slate-600 text-slate-100 placeholder:text-slate-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Cargo / Título</label>
                    <Input
                      value={cargo}
                      onChange={(e) => setCargo(e.target.value)}
                      className="bg-slate-900/50 border-slate-600 text-slate-100 placeholder:text-slate-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Teléfono</label>
                    <Input
                      value={telefono}
                      onChange={(e) => setTelefono(e.target.value)}
                      className="bg-slate-900/50 border-slate-600 text-slate-100 placeholder:text-slate-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Correo Electrónico</label>
                    <Input
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="bg-slate-900/50 border-slate-600 text-slate-100 placeholder:text-slate-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Sitio Web</label>
                    <Input
                      value={web}
                      onChange={(e) => setWeb(e.target.value)}
                      className="bg-slate-900/50 border-slate-600 text-slate-100 placeholder:text-slate-500"
                    />
                  </div>
                </div>

                <div className="border-t border-slate-700 pt-6 space-y-4">
                  <h3 className="text-sm font-semibold text-white">Estilo Visual</h3>
                  
                  {/* Theme Select */}
                  <div>
                    <label className="block text-xs text-slate-400 mb-2">Fondo</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setDarkMode(true)}
                        className={`py-2 px-3 rounded-lg text-xs font-medium border transition-all ${
                          darkMode 
                            ? 'bg-slate-700 border-amber-500 text-white' 
                            : 'bg-slate-900/30 border-slate-700 text-slate-400 hover:bg-slate-800'
                        }`}
                      >
                        Oscuro (Digital)
                      </button>
                      <button
                        onClick={() => setDarkMode(false)}
                        className={`py-2 px-3 rounded-lg text-xs font-medium border transition-all ${
                          !darkMode 
                            ? 'bg-slate-700 border-amber-500 text-white' 
                            : 'bg-slate-900/30 border-slate-700 text-slate-400 hover:bg-slate-800'
                        }`}
                      >
                        Claro (Para Imprimir)
                      </button>
                    </div>
                  </div>

                  {/* Accent Select */}
                  <div>
                    <label className="block text-xs text-slate-400 mb-2">Detalles / Detalles de Acento</label>
                    <div className="flex gap-3">
                      {(['gold', 'blue', 'silver'] as const).map((color) => (
                        <button
                          key={color}
                          onClick={() => setAccentColor(color)}
                          className={`w-8 h-8 rounded-full border-2 transition-all flex items-center justify-center ${
                            color === 'gold' ? 'bg-amber-500 border-amber-300' :
                            color === 'blue' ? 'bg-blue-600 border-blue-400' :
                            'bg-slate-400 border-slate-300'
                          } ${accentColor === color ? 'ring-2 ring-offset-2 ring-offset-slate-800 ring-white scale-110' : 'opacity-70 hover:opacity-100'}`}
                        >
                          {accentColor === color && <Check className="w-4 h-4 text-white" />}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Business Card Previews */}
          <div className="lg:col-span-2 space-y-8 flex flex-col items-center justify-center">
            {/* Front View */}
            <div className="w-full max-w-lg">
              <h3 className="text-slate-400 text-sm font-semibold mb-3 flex items-center gap-2">
                <span>VISTA FRONTAL</span>
              </h3>
              <div 
                className={`relative w-full aspect-[1.75] rounded-2xl shadow-2xl overflow-hidden border transition-colors duration-300 ${
                  darkMode ? 'bg-[#0b0f19] border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
                }`}
              >
                {/* Accent line on left */}
                <div className={`absolute left-0 top-0 bottom-0 w-3 bg-gradient-to-b ${getAccentClass()}`} />
                
                {/* Tech background elements for dark mode */}
                {darkMode && (
                  <>
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl" />
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl" />
                  </>
                )}

                <div className="h-full flex flex-col items-center justify-center p-8">
                  <div className="relative w-20 h-20 mb-3">
                    <Image
                      src="/logo/logo_jsmaster.png"
                      alt="JS Master"
                      fill
                      className={`object-contain ${!darkMode ? 'brightness-50' : ''}`}
                    />
                  </div>
                  <h2 className="text-3xl font-bold tracking-widest bg-clip-text text-transparent bg-gradient-to-r from-slate-100 to-slate-300 dark:from-white dark:to-slate-200">
                    <span className={!darkMode ? 'text-slate-900' : 'text-white'}>JS MASTER</span>
                  </h2>
                  <p className={`text-xs tracking-[0.25em] font-semibold mt-1 uppercase bg-gradient-to-r ${getAccentClass()} bg-clip-text text-transparent`}>
                    Construcción y Terminaciones
                  </p>
                </div>
              </div>
            </div>

            {/* Back View */}
            <div className="w-full max-w-lg">
              <h3 className="text-slate-400 text-sm font-semibold mb-3 flex items-center gap-2">
                <span>VISTA POSTERIOR</span>
              </h3>
              <div 
                className={`relative w-full aspect-[1.75] rounded-2xl shadow-2xl overflow-hidden border transition-colors duration-300 ${
                  darkMode ? 'bg-[#0b0f19] border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
                }`}
              >
                {/* Top thin accent line */}
                <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${getAccentClass()}`} />

                <div className="h-full grid grid-cols-12 p-8 items-center gap-4">
                  {/* Left Side: Brand info */}
                  <div className="col-span-8 flex flex-col justify-between h-full py-2">
                    <div>
                      <h3 className="text-2xl font-bold tracking-wide">{nombre}</h3>
                      <p className={`text-xs font-semibold uppercase tracking-wider bg-gradient-to-r ${getAccentClass()} bg-clip-text text-transparent mt-1`}>
                        {cargo}
                      </p>
                    </div>

                    <div className="space-y-2 mt-4 text-xs font-light">
                      <div className="flex items-center gap-3">
                        <Phone className={`w-4 h-4 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`} />
                        <span>{telefono}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Mail className={`w-4 h-4 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`} />
                        <span>{email}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Globe className={`w-4 h-4 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`} />
                        <span>{web}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Side: Logo */}
                  <div className="col-span-4 flex flex-col items-end justify-start h-full py-2">
                    <div className="flex items-center gap-2">
                      <div className="relative w-8 h-8">
                        <Image
                          src="/logo/logo_jsmaster.png"
                          alt="JS Master"
                          fill
                          className={`object-contain ${!darkMode ? 'brightness-50' : ''}`}
                        />
                      </div>
                      <span className="font-bold tracking-wider text-xs">JS MASTER</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden container designed ONLY for printing */}
      <div className="hidden print:flex print-container">
        {/* Printable Front Side */}
        <div className="business-card-print p-0 relative">
          <div className={`absolute left-0 top-0 bottom-0 w-[4mm] bg-gradient-to-b ${getAccentClass()}`} />
          <div className="h-full flex flex-col items-center justify-center p-6 text-center">
            <div className="relative w-14 h-14 mb-2">
              <Image
                src="/logo/logo_jsmaster.png"
                alt="JS Master"
                fill
                className={`object-contain ${!darkMode ? 'brightness-50 animate-none' : 'animate-none'}`}
              />
            </div>
            <h2 className="text-2xl font-bold tracking-widest">
              <span>JS MASTER</span>
            </h2>
            <p className={`text-[7px] tracking-[0.25em] font-semibold uppercase mt-0.5 bg-gradient-to-r ${getAccentClass()} bg-clip-text text-transparent`}>
              Construcción y Terminaciones
            </p>
          </div>
        </div>

        {/* Printable Back Side */}
        <div className="business-card-print p-6 relative">
          <div className={`absolute top-0 left-0 right-0 h-[1.5mm] bg-gradient-to-r ${getAccentClass()}`} />
          <div className="h-full grid grid-cols-12 items-center gap-2">
            <div className="col-span-8 flex flex-col justify-between h-full py-1">
              <div>
                <h3 className="text-lg font-bold tracking-wide leading-tight">{nombre}</h3>
                <p className={`text-[8px] font-semibold uppercase tracking-wider bg-gradient-to-r ${getAccentClass()} bg-clip-text text-transparent mt-0.5`}>
                  {cargo}
                </p>
              </div>

              <div className="space-y-1.5 mt-2 text-[8px] font-light">
                <div className="flex items-center gap-2">
                  <Phone className="w-3 h-3 text-slate-500" />
                  <span>{telefono}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-3 h-3 text-slate-500" />
                  <span>{email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Globe className="w-3 h-3 text-slate-500" />
                  <span>{web}</span>
                </div>
              </div>
            </div>

            <div className="col-span-4 flex flex-col items-end justify-start h-full py-1">
              <div className="flex items-center gap-1.5">
                <div className="relative w-6 h-6">
                  <Image
                    src="/logo/logo_jsmaster.png"
                    alt="JS Master"
                    fill
                    className={`object-contain ${!darkMode ? 'brightness-50' : ''}`}
                  />
                </div>
                <span className="font-bold tracking-wider text-[8px]">JS MASTER</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

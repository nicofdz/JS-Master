'use client'

import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { CheckCircle, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

export default function ConfirmedPage() {
    return (
        <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
            <div className="mb-8 relative w-48 h-16">
                <Image
                    src="/logo/logo_jsmaster.png"
                    alt="JS Master Logo"
                    fill
                    className="object-contain"
                    priority
                />
            </div>

            <Card className="max-w-md w-full bg-slate-800 border-slate-700 shadow-xl">
                <CardContent className="pt-8 pb-8 px-6 text-center space-y-6">
                    <div className="flex justify-center">
                        <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center animate-bounce-slow">
                            <CheckCircle className="w-10 h-10 text-green-500" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <h1 className="text-2xl font-bold text-slate-100">
                            ¡Cuenta Confirmada!
                        </h1>
                        <p className="text-slate-400">
                            Tu correo ha sido verificado correctamente. Ya puedes acceder al sistema.
                        </p>
                    </div>

                    <div className="pt-4">
                        <Link href="/login" className="block w-full">
                            <Button className="w-full bg-blue-600 hover:bg-blue-700 h-11 text-base group cursor-pointer relative z-20">
                                Iniciar Sesión
                                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                            </Button>
                        </Link>
                    </div>
                </CardContent>
            </Card>

            <div className="mt-8 text-center text-sm text-slate-500">
                <p>&copy; {new Date().getFullYear()} JS Master. Todos los derechos reservados.</p>
            </div>
        </div>
    )
}

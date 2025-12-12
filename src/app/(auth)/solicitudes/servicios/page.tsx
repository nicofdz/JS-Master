import { ServiceRequestsTable } from '@/components/requests/ServiceRequestsTable'
import { FileText } from 'lucide-react'

export default function ServiceRequestsPage() {
    return (
        <div className="p-8 space-y-8">
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-purple-600/20">
                    <FileText className="w-6 h-6" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">Solicitudes de Cotización</h1>
                    <p className="text-slate-400">Gestiona los requerimientos de servicios enviados por empresas.</p>
                </div>
            </div>

            <ServiceRequestsTable />
        </div>
    )
}

import { JobApplicationsTable } from '@/components/requests/JobApplicationsTable'
import { Briefcase } from 'lucide-react'

export default function JobApplicationsPage() {
    return (
        <div className="p-8 space-y-8">
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-600/20">
                    <Briefcase className="w-6 h-6" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">Bolsa de Trabajo</h1>
                    <p className="text-slate-400">Gestiona las postulaciones recibidas desde el portal web.</p>
                </div>
            </div>

            <JobApplicationsTable />
        </div>
    )
}

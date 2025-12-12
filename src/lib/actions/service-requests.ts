'use server'

import { createClient } from '@/lib/supabase-server'

export type ServiceRequestState = {
    success?: boolean
    message?: string
    errors?: {
        [key: string]: string[]
    }
}

export async function submitServiceRequest(prevState: ServiceRequestState, formData: FormData) {
    const supabase = createClient()

    // Validate fields
    const company_name = formData.get('company_name') as string
    const contact_name = formData.get('contact_name') as string
    const email = formData.get('email') as string
    const phone = formData.get('phone') as string
    const project_type = formData.get('project_type') as string
    const location = formData.get('location') as string
    const message = formData.get('message') as string

    // Basic validation
    if (!contact_name || !email || !phone) {
        return {
            success: false,
            message: 'Por favor complete los campos de contacto requeridos.'
        }
    }

    try {
        const { error } = await supabase
            .from('service_requests')
            .insert({
                company_name,
                contact_name,
                email,
                phone,
                project_type,
                location,
                message,
                status: 'new'
            })

        if (error) {
            console.error('Error submitting service request:', error)
            return {
                success: false,
                message: 'Hubo un error al enviar tu solicitud. Por favor intenta nuevamente.'
            }
        }

        return {
            success: true,
            message: '¡Solicitud recibida! Te contactaremos a la brevedad para evaluar tu proyecto.'
        }
    } catch (error) {
        console.error('Server error:', error)
        return {
            success: false,
            message: 'Error del servidor. Por favor intenta más tarde.'
        }
    }
}

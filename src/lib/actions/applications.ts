'use server'

import { createClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

export type ApplicationState = {
    success?: boolean
    message?: string
    errors?: {
        [key: string]: string[]
    }
}

export async function submitApplication(prevState: ApplicationState, formData: FormData) {
    const supabase = createClient()

    // Validate fields
    const full_name = formData.get('full_name') as string
    const rut = formData.get('rut') as string
    const email = formData.get('email') as string
    const phone = formData.get('phone') as string
    const experience_years = formData.get('experience_years') as string
    const specialization = formData.get('specialization') as string
    const message = formData.get('message') as string

    // Basic validation
    if (!full_name || !rut || !email || !phone || !specialization) {
        return {
            success: false,
            message: 'Por favor complete todos los campos requeridos.'
        }
    }

    try {
        const { error } = await supabase
            .from('job_applications')
            .insert({
                full_name,
                rut,
                email,
                phone,
                experience_years: experience_years ? parseInt(experience_years) : 0,
                specialization,
                message,
                status: 'pending'
            })

        if (error) {
            console.error('Error submitting application:', error)
            return {
                success: false,
                message: 'Hubo un error al enviar tu postulación. Por favor intenta nuevamente.'
            }
        }

        return {
            success: true,
            message: '¡Postulación recibida con éxito! Te contactaremos si tu perfil calza con nuestras necesidades.'
        }
    } catch (error) {
        console.error('Server error:', error)
        return {
            success: false,
            message: 'Error del servidor. Por favor intenta más tarde.'
        }
    }
}

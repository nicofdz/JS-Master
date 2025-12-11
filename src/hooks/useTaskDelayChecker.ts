'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

export function useTaskDelayChecker() {
    const pathname = usePathname()

    useEffect(() => {
        const checkDelays = async () => {
            try {
                // Llamar endpoint que verifica retrasos y envía notificaciones
                await fetch('/api/cron/check-delayed-tasks')
            } catch (error) {
                console.error('Error checking task delays:', error)
            }
        }

        checkDelays()
    }, [pathname])
}

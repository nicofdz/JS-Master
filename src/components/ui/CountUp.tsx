'use client'

import { useState, useEffect } from 'react'
import { useOnScreen } from '@/components/ui/RevealOnScroll'

export const CountUpAnimation = ({ target, duration = 2000, suffix = '' }: { target: number, duration?: number, suffix?: string }) => {
    const [count, setCount] = useState(0)
    const { ref, isVisible } = useOnScreen()

    useEffect(() => {
        if (!isVisible) return

        let startTime: number
        const animateCount = (timestamp: number) => {
            if (!startTime) startTime = timestamp
            const progress = timestamp - startTime

            if (progress < duration) {
                setCount(Math.min(Math.floor((progress / duration) * target), target))
                requestAnimationFrame(animateCount)
            } else {
                setCount(target)
            }
        }

        requestAnimationFrame(animateCount)
    }, [isVisible, target, duration])

    return <span ref={ref}>{count}{suffix}</span>
}

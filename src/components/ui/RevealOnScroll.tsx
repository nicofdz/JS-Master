'use client'

import { useEffect, useRef, useState } from 'react'

export function useOnScreen(options?: IntersectionObserverInit) {
    const ref = useRef<HTMLDivElement>(null)
    const [isVisible, setIsVisible] = useState(false)

    useEffect(() => {
        const observer = new IntersectionObserver(([entry]) => {
            // Trigger only once when it comes into view
            if (entry.isIntersecting) {
                setIsVisible(true)
                observer.disconnect()
            }
        }, { threshold: 0.1, ...options })

        if (ref.current) {
            observer.observe(ref.current)
        }

        return () => {
            observer.disconnect()
        }
    }, [ref, options])

    return { ref, isVisible }
}

interface RevealProps {
    children: React.ReactNode
    className?: string
    delay?: number
}

export const RevealOnScroll = ({ children, className = '', delay = 0 }: RevealProps) => {
    const { ref, isVisible } = useOnScreen()

    return (
        <div
            ref={ref}
            className={`transition-all duration-1000 ease-out transform ${isVisible
                    ? 'opacity-100 translate-y-0'
                    : 'opacity-0 translate-y-12'
                } ${className}`}
            style={{ transitionDelay: `${delay}ms` }}
        >
            {children}
        </div>
    )
}

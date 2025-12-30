import { cn } from '@/lib/utils'
import { ButtonHTMLAttributes, forwardRef } from 'react'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 disabled:pointer-events-none'

    const variants = {
      primary: 'bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-900/20 focus:ring-blue-500',
      secondary: 'bg-slate-700 text-slate-100 hover:bg-slate-600 shadow-lg shadow-black/20 focus:ring-slate-500',
      success: 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-lg shadow-emerald-900/20 focus:ring-emerald-500',
      warning: 'bg-amber-600 text-white hover:bg-amber-500 shadow-lg shadow-amber-900/20 focus:ring-amber-500',
      danger: 'bg-rose-600 text-white hover:bg-rose-500 shadow-lg shadow-rose-900/20 focus:ring-rose-500',
      outline: 'border border-slate-600 bg-transparent text-slate-300 hover:bg-slate-800 focus:ring-blue-500',
      ghost: 'bg-transparent text-slate-400 hover:bg-white/5 hover:text-white focus:ring-white/10'
    }

    const sizes = {
      sm: 'px-3 py-2 text-sm',
      md: 'px-4 py-2 text-sm',
      lg: 'px-6 py-3 text-base',
      xl: 'px-8 py-4 text-lg'
    }

    return (
      <button
        className={cn(
          baseStyles,
          variants[variant],
          sizes[size],
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)

Button.displayName = 'Button'

export { Button }

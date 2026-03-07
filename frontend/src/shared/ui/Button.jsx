import { forwardRef } from 'react'
import { cn } from '@shared/lib/cn'

const variants = {
  primary: 'bg-primary-600 text-white hover:bg-primary-700 shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40',
  secondary: 'bg-white text-navy-900 border-2 border-navy-200 hover:border-primary-500 hover:text-primary-600',
  ghost: 'text-navy-700 hover:bg-navy-100 hover:text-navy-900',
  outline: 'border-2 border-primary-500 text-primary-600 hover:bg-primary-50',
}

const sizes = {
  sm: 'px-4 py-2 text-sm',
  md: 'px-6 py-3 text-base',
  lg: 'px-8 py-4 text-lg',
}

const Button = forwardRef(({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  className, 
  icon,
  iconPosition = 'left',
  ...props 
}, ref) => {
  return (
    <button
      ref={ref}
      className={cn(
        'btn-base',
        variants[variant],
        sizes[size],
        'gap-2',
        className
      )}
      {...props}
    >
      {icon && iconPosition === 'left' && icon}
      {children}
      {icon && iconPosition === 'right' && icon}
    </button>
  )
})

Button.displayName = 'Button'

export { Button }

import { forwardRef, useRef, useCallback } from 'react'
import { AlertCircle, ChevronUp, ChevronDown } from 'lucide-react'
import { cn } from '@shared/lib/cn'

export const Input = forwardRef(
  ({ label, error, hint, className, required, leftIcon, rightIcon, ...props }, ref) => {
    const isNumber = props.type === 'number'
    const innerRef = useRef(null)
    const mergedRef = useCallback(
      (el) => {
        innerRef.current = el
        if (typeof ref === 'function') ref(el)
        else if (ref) ref.current = el
      },
      [ref],
    )

    const step = Number(props.step ?? 1)
    const min = props.min !== undefined ? Number(props.min) : undefined
    const max = props.max !== undefined ? Number(props.max) : undefined

    const nudge = (delta) => {
      const el = innerRef.current
      if (!el || props.disabled) return
      const rawValue = props.value !== undefined ? props.value : el.value
      const current = rawValue === '' || rawValue == null ? 0 : Number(rawValue)
      let next = current + delta
      if (min !== undefined) next = Math.max(min, next)
      if (max !== undefined) next = Math.min(max, next)
      const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
      nativeSetter.call(el, String(next))
      if (props.onChange) {
        props.onChange({ target: el, type: 'change' })
      } else {
        el.dispatchEvent(new Event('input',  { bubbles: true }))
        el.dispatchEvent(new Event('change', { bubbles: true }))
      }
      el.focus()
    }

    return (
      <div className="w-full">
        {label && (
          <label className="mb-1.5 block text-sm font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
            {label}
            {required && <span className="ml-0.5 text-danger">*</span>}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }}>
              {leftIcon}
            </div>
          )}
          <input
            ref={mergedRef}
            autoComplete="off"
            className={cn(
              'wrs-input flex file:border-0 file:bg-transparent file:text-sm file:font-medium ring-offset-background focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
              isNumber && '[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none',
              error ? 'border-danger/40 focus-visible:ring-danger/20' : '',
              leftIcon  && 'pl-10',
              (rightIcon || isNumber) && 'pr-9',
              props.disabled && 'opacity-50',
              className
            )}
            {...props}
          />

          {isNumber && !props.disabled && (
            <div className="absolute right-0 top-0 flex h-full w-9 flex-col border-l" style={{ borderColor: 'var(--color-border)' }}>
              <button
                type="button"
                tabIndex={-1}
                onMouseDown={(e) => { e.preventDefault(); nudge(step) }}
                className="flex flex-1 items-center justify-center rounded-tr-xl transition-colors duration-150 hover:bg-muted"
                style={{ color: 'var(--color-text-muted)' }}
              >
                <ChevronUp className="h-3 w-3" />
              </button>
              <div className="h-px" style={{ backgroundColor: 'var(--color-border)' }} />
              <button
                type="button"
                tabIndex={-1}
                onMouseDown={(e) => { e.preventDefault(); nudge(-step) }}
                className="flex flex-1 items-center justify-center rounded-br-xl transition-colors duration-150 hover:bg-muted"
                style={{ color: 'var(--color-text-muted)' }}
              >
                <ChevronDown className="h-3 w-3" />
              </button>
            </div>
          )}

          {rightIcon && !isNumber && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }}>
              {rightIcon}
            </div>
          )}
        </div>
        {hint && !error && <p className="form-hint">{hint}</p>}
        {error && (
          <p className="form-error">
            <AlertCircle className="h-3 w-3" />
            {error}
          </p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

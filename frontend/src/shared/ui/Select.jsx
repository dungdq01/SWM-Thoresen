import { forwardRef, useState, useRef, useEffect, useCallback, useId } from 'react'
import { createPortal } from 'react-dom'
import { AlertCircle, ChevronDown, Check } from 'lucide-react'
import { cn } from '@shared/lib/cn'

export const Select = forwardRef(
  ({ label, error, hint, options = [], placeholder, className, required, disabled, value, defaultValue, onChange, children, ...props }, ref) => {
    const id = useId()
    const [isOpen, setIsOpen] = useState(false)
    const [dropdownStyle, setDropdownStyle] = useState({})
    const triggerRef = useRef(null)
    const dropdownRef = useRef(null)

    // Determine controlled vs uncontrolled
    const isControlled = value !== undefined
    const [internalValue, setInternalValue] = useState(defaultValue ?? '')
    const currentValue = isControlled ? value : internalValue

    // Build option list — support both `options` prop and children <option> elements
    const builtOptions = []
    if (placeholder) builtOptions.push({ value: '', label: placeholder, disabled: true })
    options.forEach((o) => builtOptions.push({ value: String(o.value), label: o.label }))
    // Parse children <option> elements
    if (children) {
      const parseChildren = (nodes) => {
        const arr = Array.isArray(nodes) ? nodes : [nodes]
        arr.forEach((child) => {
          if (!child || typeof child !== 'object') return
          if (child.type === 'option') {
            builtOptions.push({
              value: String(child.props.value ?? ''),
              label: child.props.children,
              disabled: child.props.disabled,
            })
          }
        })
      }
      parseChildren(children)
    }

    const selectedOption = builtOptions.find((o) => String(o.value) === String(currentValue ?? ''))
    const displayLabel = selectedOption && selectedOption.value !== ''
      ? selectedOption.label
      : <span style={{ color: 'var(--color-text-muted)' }}>{placeholder ?? 'Chọn...'}</span>

    const positionDropdown = useCallback(() => {
      if (!triggerRef.current) return
      const rect = triggerRef.current.getBoundingClientRect()
      const viewportHeight = window.innerHeight
      const spaceBelow = viewportHeight - rect.bottom
      const spaceAbove = rect.top
      const dropdownHeight = Math.min(builtOptions.length * 40 + 8, 280)

      const openUpward = spaceBelow < dropdownHeight + 8 && spaceAbove > spaceBelow

      setDropdownStyle({
        position: 'fixed',
        left: rect.left,
        width: rect.width,
        zIndex: 9999,
        ...(openUpward
          ? { bottom: viewportHeight - rect.top + 4 }
          : { top: rect.bottom + 4 }),
      })
    }, [builtOptions.length])

    const open = () => {
      if (disabled) return
      positionDropdown()
      setIsOpen(true)
    }

    const close = () => setIsOpen(false)

    const select = (optValue) => {
      if (!isControlled) setInternalValue(optValue)
      if (onChange) {
        // Simulate a native change event for react-hook-form compatibility
        const nativeEvent = { target: { value: optValue, name: props.name } }
        onChange(nativeEvent)
      }
      close()
    }

    // Close on outside click
    useEffect(() => {
      if (!isOpen) return
      const handle = (e) => {
        if (
          triggerRef.current && !triggerRef.current.contains(e.target) &&
          dropdownRef.current && !dropdownRef.current.contains(e.target)
        ) {
          close()
        }
      }
      document.addEventListener('mousedown', handle)
      return () => document.removeEventListener('mousedown', handle)
    }, [isOpen])

    // Reposition on scroll/resize
    useEffect(() => {
      if (!isOpen) return
      const handle = () => positionDropdown()
      window.addEventListener('scroll', handle, true)
      window.addEventListener('resize', handle)
      return () => {
        window.removeEventListener('scroll', handle, true)
        window.removeEventListener('resize', handle)
      }
    }, [isOpen, positionDropdown])

    // Keyboard navigation
    const handleKeyDown = (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); isOpen ? close() : open() }
      if (e.key === 'Escape') close()
      if (e.key === 'ArrowDown' && !isOpen) { e.preventDefault(); open() }
    }

    const triggerClass = cn(
      'wrs-input flex items-center justify-between cursor-pointer select-none',
      'focus:outline-none',
      disabled && 'opacity-50 cursor-not-allowed',
      isOpen && 'border-[#60a5fa] ring-2 ring-ice/20',
      error
        ? 'border-danger/40 focus-visible:ring-danger/20'
        : !isOpen && 'hover:border-moon-300',
      className
    )

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={id}
            className="mb-1.5 block text-sm font-semibold"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {label}
            {required && <span className="ml-0.5 text-danger">*</span>}
          </label>
        )}

        {/* Hidden native select for form submission & ref */}
        <input
          ref={ref}
          type="hidden"
          name={props.name}
          value={currentValue ?? ''}
          id={id}
        />

        <div className="relative">
          <div
            ref={triggerRef}
            role="combobox"
            aria-expanded={isOpen}
            aria-haspopup="listbox"
            aria-disabled={disabled}
            tabIndex={disabled ? -1 : 0}
            onClick={open}
            onKeyDown={handleKeyDown}
            className={triggerClass}
          >
            <span className="truncate text-sm" style={{ color: selectedOption?.value !== '' ? 'var(--color-text)' : undefined }}>
              {displayLabel}
            </span>
            <ChevronDown
              className={cn(
                'ml-2 h-4 w-4 shrink-0 transition-transform duration-200',
                isOpen && 'rotate-180'
              )}
              style={{ color: 'var(--color-text-muted)' }}
            />
          </div>
        </div>

        {hint && !error && <p className="form-hint">{hint}</p>}
        {error && <p className="form-error"><AlertCircle className="h-3 w-3" />{error}</p>}

        {isOpen && createPortal(
          <div
            ref={dropdownRef}
            role="listbox"
            style={{
              ...dropdownStyle,
              backgroundColor: 'var(--color-bg-card)',
              borderColor: 'var(--color-border)',
              maxHeight: '280px',
              animation: 'wrs-dropdown-in 0.12s ease-out',
            }}
            className="rounded-xl border py-1 shadow-xl overflow-y-auto"
            onMouseDown={(e) => e.preventDefault()}
          >
            <style>{`
              @keyframes wrs-dropdown-in {
                from { opacity: 0; transform: scaleY(0.95) translateY(-4px); }
                to   { opacity: 1; transform: scaleY(1)    translateY(0); }
              }
            `}</style>
            {builtOptions.map((opt, i) => {
              const isSelected = String(opt.value) === String(currentValue ?? '')
              const isPlaceholder = opt.disabled || (opt.value === '' && i === 0)
              if (isPlaceholder && opt.value === '') return null
              return (
                <div
                  key={`${opt.value}-${i}`}
                  role="option"
                  aria-selected={isSelected}
                  aria-disabled={opt.disabled}
                  onMouseDown={() => !opt.disabled && select(opt.value)}
                  className={cn(
                    'flex items-center justify-between px-3 py-2.5 text-sm cursor-pointer transition-colors duration-100',
                    isSelected
                      ? 'font-semibold'
                      : 'font-normal',
                    opt.disabled && 'opacity-40 cursor-not-allowed'
                  )}
                  style={{
                    color: isSelected ? '#60a5fa' : 'var(--color-text)',
                    backgroundColor: isSelected ? 'rgba(96,165,250,0.08)' : 'transparent',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected && !opt.disabled)
                      e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = isSelected ? 'rgba(96,165,250,0.08)' : 'transparent'
                  }}
                >
                  <span>{opt.label}</span>
                  {isSelected && <Check className="h-3.5 w-3.5 shrink-0" style={{ color: '#60a5fa' }} />}
                </div>
              )
            })}
          </div>,
          document.body
        )}
      </div>
    )
  }
)

Select.displayName = 'Select'

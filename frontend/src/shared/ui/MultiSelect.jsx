import { forwardRef, useState, useRef, useEffect, useCallback, useId } from 'react'
import { createPortal } from 'react-dom'
import { AlertCircle, ChevronDown, Check, X } from 'lucide-react'
import { cn } from '@shared/lib/cn'

export const MultiSelect = forwardRef(
  ({ label, error, hint, options = [], placeholder = 'Chọn...', className, required, disabled, value = [], onChange, ...props }, ref) => {
    const id = useId()
    const [isOpen, setIsOpen] = useState(false)
    const [dropdownStyle, setDropdownStyle] = useState({})
    const triggerRef = useRef(null)
    const dropdownRef = useRef(null)

    const selectedValues = Array.isArray(value) ? value : []

    const positionDropdown = useCallback(() => {
      if (!triggerRef.current) return
      const rect = triggerRef.current.getBoundingClientRect()
      const viewportHeight = window.innerHeight
      const spaceBelow = viewportHeight - rect.bottom
      const dropdownHeight = Math.min(options.length * 40 + 8, 280)

      const openUpward = spaceBelow < dropdownHeight + 8 && rect.top > spaceBelow

      setDropdownStyle({
        position: 'fixed',
        left: rect.left,
        width: rect.width,
        zIndex: 9999,
        ...(openUpward
          ? { bottom: viewportHeight - rect.top + 4 }
          : { top: rect.bottom + 4 }),
      })
    }, [options.length])

    const open = () => {
      if (disabled) return
      positionDropdown()
      setIsOpen(true)
    }

    const close = () => setIsOpen(false)

    const toggleOption = (optValue) => {
      const newValues = selectedValues.includes(optValue)
        ? selectedValues.filter((v) => v !== optValue)
        : [...selectedValues, optValue]
      
      if (onChange) {
        onChange(newValues)
      }
    }

    const removeValue = (e, optValue) => {
      e.stopPropagation()
      const newValues = selectedValues.filter((v) => v !== optValue)
      if (onChange) {
        onChange(newValues)
      }
    }

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

    const handleKeyDown = (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); isOpen ? close() : open() }
      if (e.key === 'Escape') close()
      if (e.key === 'ArrowDown' && !isOpen) { e.preventDefault(); open() }
    }

    const selectedOptions = options.filter((o) => selectedValues.includes(o.value))

    const triggerClass = cn(
      'wrs-input flex items-center justify-between cursor-pointer select-none min-h-[40px]',
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

        <input
          ref={ref}
          type="hidden"
          name={props.name}
          value={selectedValues.join(',')}
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
            <div className="flex flex-1 gap-1 py-1 overflow-x-auto" style={{ flexWrap: 'nowrap', scrollbarWidth: 'none' }}>
              {selectedOptions.length === 0 ? (
                <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  {placeholder}
                </span>
              ) : (
                selectedOptions.map((opt) => (
                  <span
                    key={opt.value}
                    className="inline-flex items-center gap-1 rounded-md bg-ice/10 px-2 py-0.5 text-xs font-medium text-ice shrink-0"
                  >
                    {opt.label}
                    <button
                      type="button"
                      onClick={(e) => removeValue(e, opt.value)}
                      className="rounded-full p-0.5 hover:bg-ice/20 transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))
              )}
            </div>
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
            aria-multiselectable="true"
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
            {options.map((opt, i) => {
              const isSelected = selectedValues.includes(opt.value)
              return (
                <div
                  key={`${opt.value}-${i}`}
                  role="option"
                  aria-selected={isSelected}
                  aria-disabled={opt.disabled}
                  onMouseDown={() => !opt.disabled && toggleOption(opt.value)}
                  className={cn(
                    'flex items-center justify-between px-3 py-2.5 text-sm cursor-pointer transition-colors duration-100',
                    isSelected ? 'font-semibold' : 'font-normal',
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

MultiSelect.displayName = 'MultiSelect'

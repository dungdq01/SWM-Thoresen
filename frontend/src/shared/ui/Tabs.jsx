import { createContext, useContext, useState } from 'react'
import { cn } from '@shared/lib/cn'

const TabsContext = createContext(null)

export function Tabs({ defaultValue, value, onChange, children, className }) {
  const [internalValue, setInternalValue] = useState(defaultValue)
  const currentValue = value ?? internalValue
  const handleChange = onChange ?? setInternalValue

  return (
    <TabsContext.Provider value={{ value: currentValue, onChange: handleChange }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  )
}

export function TabsList({ children, className }) {
  return (
    <div className={cn('flex gap-1 p-1 bg-navy-100 rounded-xl', className)}>
      {children}
    </div>
  )
}

export function TabsTrigger({ value, children, className, disabled }) {
  const context = useContext(TabsContext)
  const isActive = context?.value === value

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => !disabled && context?.onChange(value)}
      className={cn(
        'px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200',
        isActive
          ? 'bg-white text-navy-900 shadow-sm'
          : 'text-navy-600 hover:text-navy-900 hover:bg-navy-50',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      {children}
    </button>
  )
}

export function TabsContent({ value, children, className }) {
  const context = useContext(TabsContext)
  if (context?.value !== value) return null

  return <div className={cn('mt-4', className)}>{children}</div>
}

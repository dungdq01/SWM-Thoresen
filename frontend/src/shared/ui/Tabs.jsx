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
    <div className={cn('inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground', className)}>
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
        'inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/30 focus-visible:ring-offset-2',
        isActive
          ? 'bg-background text-foreground shadow-sm'
          : 'text-muted-foreground hover:text-foreground',
        disabled && 'cursor-not-allowed opacity-50',
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

  return <div className={cn('mt-4 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/30 focus-visible:ring-offset-2', className)}>{children}</div>
}

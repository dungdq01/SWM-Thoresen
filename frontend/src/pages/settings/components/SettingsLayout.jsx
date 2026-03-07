import { cn } from '@shared/lib/cn'

export function SettingsLayout({ title, description, actions, children, className }) {
  return (
    <div className={cn('min-h-screen bg-navy-50/50', className)}>
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-navy-900">{title}</h1>
            {description && (
              <p className="mt-1 text-navy-600">{description}</p>
            )}
          </div>
          {actions && <div className="flex items-center gap-3">{actions}</div>}
        </div>

        <div className="bg-white rounded-2xl shadow-card border border-navy-100 p-6">
          {children}
        </div>
      </div>
    </div>
  )
}

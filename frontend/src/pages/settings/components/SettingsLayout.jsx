import { cn } from '@shared/lib/cn'

export function SettingsLayout({ title, actions, children, className }) {
  return (
    <div className={cn('page-section', className)}>
      <div className="page-header">
        <div>
          <h1 className="page-title">{title}</h1>
        </div>
        {actions && <div className="flex items-center gap-3">{actions}</div>}
      </div>

      <div className="content-section">
        <div className="space-y-6">
          <div>
            <h2 className="section-title">Operations Detail</h2>
            <p className="section-description">Lists, tables, and advanced operations are displayed below.</p>
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}

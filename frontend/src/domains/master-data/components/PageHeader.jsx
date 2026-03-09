import { Download, Plus, RefreshCw } from 'lucide-react'
import { Button } from '@shared/ui'

export function PageHeader({
  title,
  onAdd,
  addLabel = 'Thêm mới',
  onExport,
  onRefresh,
  isRefreshing = false,
  children,
}) {
  return (
    <div className="page-header">
      <div>
        <h1 className="page-title">{title}</h1>
      </div>
      <div className="flex items-center gap-3">
        {children}
        {onRefresh && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isRefreshing}
            icon={<RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />}
          >
            Làm mới
          </Button>
        )}
        {onExport && (
          <Button variant="outline" size="sm" onClick={onExport} icon={<Download className="h-4 w-4" />}>
            Xuất Excel
          </Button>
        )}
        {onAdd && (
          <Button variant="accent" onClick={onAdd} icon={<Plus className="h-4 w-4" />}>
            {addLabel}
          </Button>
        )}
      </div>
    </div>
  )
}

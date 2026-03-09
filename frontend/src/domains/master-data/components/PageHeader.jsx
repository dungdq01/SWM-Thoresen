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
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        {children}
        {onRefresh && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isRefreshing}
            icon={<RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />}
          >
            <span className="hidden sm:inline">Làm mới</span>
          </Button>
        )}
        {onExport && (
          <Button variant="outline" size="sm" onClick={onExport} icon={<Download className="h-4 w-4" />}>
            <span className="hidden sm:inline">Xuất Excel</span>
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

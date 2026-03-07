import { Plus, Download, RefreshCw } from 'lucide-react'
import { Button } from '@shared/ui'

export function PageHeader({
  title,
  description,
  onAdd,
  addLabel = 'Thêm mới',
  onExport,
  onRefresh,
  isRefreshing = false,
  children,
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-bold text-navy-900">{title}</h1>
        {description && (
          <p className="mt-1 text-navy-600">{description}</p>
        )}
      </div>
      <div className="flex items-center gap-3">
        {children}
        {onRefresh && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Làm mới
          </Button>
        )}
        {onExport && (
          <Button variant="outline" size="sm" onClick={onExport}>
            <Download className="w-4 h-4 mr-2" />
            Xuất Excel
          </Button>
        )}
        {onAdd && (
          <Button onClick={onAdd}>
            <Plus className="w-4 h-4 mr-2" />
            {addLabel}
          </Button>
        )}
      </div>
    </div>
  )
}

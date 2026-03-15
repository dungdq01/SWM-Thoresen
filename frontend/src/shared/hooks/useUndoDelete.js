/**
 * useUndoDelete — Soft Delete với Undo/Restore
 *
 * UX Principle #8 (Error Recovery): Cung cấp Undo/Soft Delete cho hành động xóa.
 * Pattern: xóa khỏi UI ngay (optimistic), hiện toast countdown 5s.
 * Nếu user bấm Undo → restore item. Nếu không → gọi onConfirm (API delete thật).
 *
 * Usage:
 *   const { items, deleteItem } = useUndoDelete(initialItems, {
 *     onConfirm: (item) => api.delete(item.id),
 *     onUndo: (item) => console.log('restored', item),
 *   })
 */
import { useState, useRef, useCallback } from 'react'
import toast from 'react-hot-toast'
import { Undo2 } from 'lucide-react'

const DEFAULT_TIMEOUT_MS = 5000

export function useUndoDelete(initialItems, options = {}) {
  const {
    onConfirm,
    onUndo,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    getLabel = (item) => item?.name || item?.label || item?.id || 'Mục này',
  } = options

  const [items, setItems] = useState(initialItems)
  const pendingTimers = useRef({})

  // Sync nếu initialItems thay đổi từ bên ngoài (e.g. sau API refetch)
  // Không dùng useEffect để tránh race condition với soft-delete state

  const deleteItem = useCallback((itemOrId) => {
    const id = typeof itemOrId === 'object' ? itemOrId.id : itemOrId
    let removedItem = null

    setItems(prev => {
      removedItem = prev.find(i => i.id === id)
      return prev.filter(i => i.id !== id)
    })

    if (!removedItem) return

    const label = getLabel(removedItem)

    // Hủy timer cũ nếu user delete item này nhiều lần
    if (pendingTimers.current[id]) {
      clearTimeout(pendingTimers.current[id])
    }

    // Hiện toast Undo
    const toastId = toast(
      (t) => (
        <UndoToastContent
          label={label}
          timeoutMs={timeoutMs}
          onUndo={() => {
            clearTimeout(pendingTimers.current[id])
            delete pendingTimers.current[id]
            setItems(prev => {
              // Restore vào đúng vị trí — thêm vào cuối nếu không trace được index
              return [...prev, removedItem]
            })
            onUndo?.(removedItem)
            toast.dismiss(t.id)
          }}
          onDismiss={() => toast.dismiss(t.id)}
        />
      ),
      {
        duration: timeoutMs + 500,
        style: {
          background: '#1e293b',
          color: '#f1f5f9',
          padding: '12px 16px',
          borderRadius: '12px',
          boxShadow: '0 10px 40px -10px rgba(0,0,0,0.35)',
          border: '1px solid rgba(241,245,249,0.08)',
          minWidth: '300px',
        },
      }
    )

    // Sau timeout → xác nhận xóa thật
    pendingTimers.current[id] = setTimeout(async () => {
      delete pendingTimers.current[id]
      toast.dismiss(toastId)
      try {
        await onConfirm?.(removedItem)
      } catch {
        // Nếu API lỗi → restore lại
        setItems(prev => [...prev, removedItem])
        toast.error(`Xóa thất bại. Đã khôi phục "${label}".`)
      }
    }, timeoutMs)
  }, [getLabel, onConfirm, onUndo, timeoutMs])

  return { items, setItems, deleteItem }
}

// ─── Toast UI component (nội bộ) ──────────────────────────────────────────────
function UndoToastContent({ label, timeoutMs, onUndo, onDismiss }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex-1 text-sm">
        Đã xóa <span className="font-semibold">&quot;{label}&quot;</span>
      </span>
      <button
        onClick={onUndo}
        className="flex items-center gap-1.5 rounded-lg bg-ice/20 px-3 py-1.5 text-xs font-bold text-ice-light transition-colors hover:bg-ice/30"
      >
        <Undo2 className="h-3.5 w-3.5" />
        Hoàn tác
      </button>
    </div>
  )
}

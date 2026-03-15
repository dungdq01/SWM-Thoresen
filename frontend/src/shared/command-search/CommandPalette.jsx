/**
 * CommandPalette — Modal toàn cục, mở bằng Ctrl+K / Cmd+K
 * Jakob's Law: dùng pattern quen thuộc như command palette
 * Hick's Law: search thay vì browse menu nhiều cấp
 */
import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X, Command } from 'lucide-react'
import { CommandSearch } from './CommandSearch'
import { useCommandPalette } from './useCommandPalette'

export function CommandPalette() {
  const { isOpen, close } = useCommandPalette()
  const overlayRef = useRef(null)

  // Đóng khi click backdrop
  const handleBackdropClick = (e) => {
    if (e.target === overlayRef.current) close()
  }

  if (!isOpen) return null

  return createPortal(
    <div
      ref={overlayRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-[999] flex items-start justify-center bg-navy-950/50 px-4 pt-[15vh] backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
    >
      <div className="w-full max-w-xl animate-slide-up rounded-2xl border border-moon-200 bg-white shadow-soft-xl">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-moon-100 px-4 py-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-navy-800">
            <Command className="h-3.5 w-3.5 text-ice-light" />
          </div>
          <div className="flex-1">
            <CommandSearch autoFocus onSelect={close} />
          </div>
          <button
            onClick={close}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-navy-400 transition-colors hover:bg-moon-100 hover:text-navy-600"
            aria-label="Đóng"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Footer hint */}
        <div className="flex items-center justify-between px-4 py-2.5 text-[11px] text-navy-400">
          <div className="flex items-center gap-3">
            <span><kbd className="rounded bg-moon-100 px-1.5 py-0.5 font-mono text-[10px]">↑↓</kbd> điều hướng</span>
            <span><kbd className="rounded bg-moon-100 px-1.5 py-0.5 font-mono text-[10px]">Enter</kbd> chọn</span>
            <span><kbd className="rounded bg-moon-100 px-1.5 py-0.5 font-mono text-[10px]">Esc</kbd> đóng</span>
          </div>
          <div className="flex items-center gap-1">
            <kbd className="rounded bg-moon-100 px-1.5 py-0.5 font-mono text-[10px]">Ctrl</kbd>
            <span>+</span>
            <kbd className="rounded bg-moon-100 px-1.5 py-0.5 font-mono text-[10px]">K</kbd>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

/**
 * AiSuggestionCard — UX Principle #5: System-Suggest, Human-Approve
 * Risk-based AI Governance (Section 5.1):
 *   low    → AI tự động áp dụng
 *   medium → AI đề xuất, user xác nhận
 *   high   → AI chỉ cảnh báo, user tự xử lý
 * XAI — nút "Tại sao?" (Section 5.1)
 */
import { useState } from 'react'
import { Sparkles, HelpCircle, Check, X, ChevronDown, ChevronUp, AlertTriangle, Zap } from 'lucide-react'
import { cn } from '@shared/lib/cn'

// Dùng inline style cho màu để tự động thích ứng dark/light
const RISK_CONFIG = {
  low: {
    label:      'AI tự động',
    icon:       Zap,
    badgeStyle: { background: 'var(--status-done-bg)',    color: 'var(--status-done-text)',    border: '1px solid var(--status-done-text)' },
    dotColor:   'var(--status-done-text)',
    leftBorder: '#10b981',
  },
  medium: {
    label:      'AI đề xuất',
    icon:       Sparkles,
    badgeStyle: { background: 'var(--status-planned-bg)', color: 'var(--status-planned-text)', border: '1px solid var(--status-planned-text)' },
    dotColor:   'var(--status-planned-text)',
    leftBorder: '#3b82f6',
  },
  high: {
    label:      'AI cảnh báo',
    icon:       AlertTriangle,
    badgeStyle: { background: 'var(--status-transit-bg)', color: 'var(--status-transit-text)', border: '1px solid var(--status-transit-text)' },
    dotColor:   'var(--status-transit-text)',
    leftBorder: '#f97316',
  },
}

export function AiSuggestionCard({
  risk = 'medium', title, summary, reason, confidence,
  onApprove, onDismiss, className,
}) {
  const [showReason, setShowReason] = useState(false)
  const [done, setDone] = useState(false)

  if (done) return null

  const cfg = RISK_CONFIG[risk]
  const RiskIcon = cfg.icon

  return (
    <div
      className={cn('rounded-xl border p-4 transition-all duration-200', className)}
      style={{
        backgroundColor: 'var(--color-bg-card)',
        borderColor: 'var(--color-border)',
        borderLeftColor: cfg.leftBorder,
        borderLeftWidth: '3px',
      }}
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <div
          className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: 'var(--color-bg-subtle)' }}
        >
          <RiskIcon className="h-4 w-4" style={{ color: cfg.dotColor }} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
              style={cfg.badgeStyle}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: cfg.dotColor }} />
              {cfg.label}
            </span>
            {confidence != null && (
              <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                Độ tin cậy: <span className="font-semibold" style={{ color: 'var(--color-text-secondary)' }}>{confidence}%</span>
              </span>
            )}
          </div>
          <p className="mt-1.5 text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{title}</p>
          <p className="mt-0.5 text-[13px]" style={{ color: 'var(--color-text-secondary)' }}>{summary}</p>
        </div>
      </div>

      {/* XAI — nút "Tại sao?" */}
      {reason && (
        <div className="mt-3">
          <button
            onClick={() => setShowReason(v => !v)}
            className="flex items-center gap-1.5 text-[12px] font-semibold transition-colors"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            <HelpCircle className="h-3.5 w-3.5" />
            Tại sao AI đề xuất điều này?
            {showReason ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
          {showReason && (
            <p
              className="mt-2 rounded-lg p-3 text-[12px] leading-relaxed"
              style={{ backgroundColor: 'var(--color-bg-subtle)', color: 'var(--color-text-secondary)' }}
            >
              {reason}
            </p>
          )}
        </div>
      )}

      {/* Actions */}
      {risk !== 'high' && (
        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={() => { setDone(true); onApprove?.() }}
            className="flex items-center gap-1.5 rounded-lg bg-navy-800 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-navy-700 dark:bg-navy-700 dark:hover:bg-navy-600"
          >
            <Check className="h-3.5 w-3.5" />
            {risk === 'low' ? 'Đã áp dụng' : 'Duyệt'}
          </button>
          <button
            onClick={() => { setDone(true); onDismiss?.() }}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors"
            style={{ border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-subtle)', color: 'var(--color-text-secondary)' }}
          >
            <X className="h-3.5 w-3.5" />
            Bỏ qua
          </button>
        </div>
      )}
      {risk === 'high' && (
        <div className="mt-3 flex items-center gap-2">
          <span className="text-[12px] font-medium" style={{ color: 'var(--status-transit-text)' }}>
            Rủi ro cao — cần xử lý thủ công
          </span>
          <button
            onClick={() => { setDone(true); onDismiss?.() }}
            className="ml-auto flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors"
            style={{ border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-subtle)', color: 'var(--color-text-muted)' }}
          >
            <X className="h-3 w-3" />
            Đã hiểu
          </button>
        </div>
      )}
    </div>
  )
}

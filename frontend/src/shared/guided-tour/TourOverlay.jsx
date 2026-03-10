import { useEffect, useState, useRef, useCallback } from 'react'
import { X, ChevronLeft, ChevronRight, SkipForward, MapPin } from 'lucide-react'
import { useGuidedTour } from './GuidedTourProvider'

const PADDING = 8
const TOOLTIP_WIDTH = 380
const TOOLTIP_GAP = 12

function getTooltipPosition(targetRect, placement, tooltipHeight) {
  if (!targetRect) {
    return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)', arrowClass: '' }
  }

  const vt = targetRect.viewportTop
  const vl = targetRect.viewportLeft
  const tw = targetRect.width
  const th = targetRect.height
  const winW = window.innerWidth
  const winH = window.innerHeight

  let top, left, arrowClass

  switch (placement) {
    case 'top':
      top = vt - TOOLTIP_GAP - (tooltipHeight || 200)
      left = vl + tw / 2 - TOOLTIP_WIDTH / 2
      arrowClass = 'arrow-bottom'
      break
    case 'right':
      top = vt + th / 2 - (tooltipHeight || 200) / 2
      left = vl + tw + TOOLTIP_GAP + PADDING
      arrowClass = 'arrow-left'
      break
    case 'left':
      top = vt + th / 2 - (tooltipHeight || 200) / 2
      left = vl - TOOLTIP_WIDTH - TOOLTIP_GAP - PADDING
      arrowClass = 'arrow-right'
      break
    case 'bottom':
    default:
      top = vt + th + TOOLTIP_GAP + PADDING
      left = vl + tw / 2 - TOOLTIP_WIDTH / 2
      arrowClass = 'arrow-top'
      break
  }

  // Clamp to viewport
  if (left < 16) left = 16
  if (left + TOOLTIP_WIDTH > winW - 16) left = winW - TOOLTIP_WIDTH - 16
  if (top < 16) top = 16
  if (top + (tooltipHeight || 200) > winH - 16) top = winH - (tooltipHeight || 200) - 16

  return { top: `${top}px`, left: `${left}px`, arrowClass }
}

export function TourOverlay() {
  const {
    isRunning,
    activeTour,
    currentStep,
    currentStepIndex,
    totalSteps,
    targetRect,
    nextStep,
    prevStep,
    stopTour,
    goToStep,
  } = useGuidedTour()

  const tooltipRef = useRef(null)
  const [tooltipHeight, setTooltipHeight] = useState(200)
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    if (tooltipRef.current) {
      setTooltipHeight(tooltipRef.current.offsetHeight)
    }
  }, [currentStep, targetRect])

  // Animate step transition
  useEffect(() => {
    if (isRunning) {
      setIsAnimating(true)
      const t = setTimeout(() => setIsAnimating(false), 300)
      return () => clearTimeout(t)
    }
  }, [currentStepIndex, isRunning])

  // Keyboard navigation
  const handleKeyDown = useCallback((e) => {
    if (!isRunning) return
    if (e.key === 'Escape') stopTour()
    if (e.key === 'ArrowRight' || e.key === 'Enter') nextStep()
    if (e.key === 'ArrowLeft') prevStep()
  }, [isRunning, stopTour, nextStep, prevStep])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  if (!isRunning || !currentStep) return null

  const placement = currentStep.placement || 'bottom'
  const tooltipPos = getTooltipPosition(targetRect, placement, tooltipHeight)
  const progress = ((currentStepIndex + 1) / totalSteps) * 100
  const isLastStep = currentStepIndex === totalSteps - 1

  return (
    <div className="tour-overlay" aria-live="polite">
      {/* Backdrop overlay with spotlight cutout */}
      <svg
        className="tour-backdrop"
        width="100%"
        height="100%"
        style={{ position: 'fixed', inset: 0, zIndex: 9998, pointerEvents: 'none' }}
      >
        <defs>
          <mask id="tour-spotlight-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {targetRect && (
              <rect
                x={targetRect.viewportLeft - PADDING}
                y={targetRect.viewportTop - PADDING}
                width={targetRect.width + PADDING * 2}
                height={targetRect.height + PADDING * 2}
                rx="8"
                ry="8"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0" y="0" width="100%" height="100%"
          fill="rgba(15, 23, 42, 0.65)"
          mask="url(#tour-spotlight-mask)"
          style={{ pointerEvents: 'auto' }}
          onClick={(e) => e.stopPropagation()}
        />
      </svg>

      {/* Spotlight border ring */}
      {targetRect && (
        <div
          className="tour-spotlight-ring"
          style={{
            position: 'fixed',
            top: targetRect.viewportTop - PADDING,
            left: targetRect.viewportLeft - PADDING,
            width: targetRect.width + PADDING * 2,
            height: targetRect.height + PADDING * 2,
            borderRadius: '8px',
            border: '2px solid rgba(56, 189, 248, 0.8)',
            boxShadow: '0 0 0 4px rgba(56, 189, 248, 0.2), 0 0 20px rgba(56, 189, 248, 0.3)',
            zIndex: 9999,
            pointerEvents: 'none',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        />
      )}

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className={`tour-tooltip ${tooltipPos.arrowClass} ${isAnimating ? 'tour-tooltip-enter' : ''}`}
        style={{
          position: 'fixed',
          top: tooltipPos.top,
          left: tooltipPos.left,
          width: `${TOOLTIP_WIDTH}px`,
          zIndex: 10000,
          transition: 'top 0.3s ease, left 0.3s ease',
        }}
      >
        {/* Header */}
        <div className="tour-tooltip-header">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-sky-400 shrink-0" />
            <span className="text-xs font-medium text-sky-400 uppercase tracking-wider">
              {activeTour?.title}
            </span>
          </div>
          <button
            onClick={stopTour}
            className="tour-tooltip-close"
            aria-label="Close tour"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="tour-progress-bar">
          <div className="tour-progress-fill" style={{ width: `${progress}%` }} />
        </div>

        {/* Content */}
        <div className="tour-tooltip-body">
          <h3 className="text-sm font-bold text-white mb-2">{currentStep.title}</h3>
          <div className="text-[13px] text-slate-300 leading-relaxed whitespace-pre-line">
            {currentStep.description}
          </div>
        </div>

        {/* Footer */}
        <div className="tour-tooltip-footer">
          <span className="text-xs text-slate-400">
            Bước {currentStepIndex + 1} / {totalSteps}
          </span>

          <div className="flex items-center gap-2">
            {currentStepIndex > 0 && (
              <button onClick={prevStep} className="tour-btn tour-btn-ghost">
                <ChevronLeft className="h-3.5 w-3.5" />
                <span>Trước</span>
              </button>
            )}

            <button onClick={nextStep} className="tour-btn tour-btn-primary">
              {isLastStep ? (
                <>
                  <span>Hoàn tất</span>
                  <SkipForward className="h-3.5 w-3.5" />
                </>
              ) : (
                <>
                  <span>Tiếp theo</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Step dots */}
        <div className="tour-step-dots">
          {Array.from({ length: totalSteps }, (_, i) => (
            <button
              key={i}
              className={`tour-dot ${i === currentStepIndex ? 'active' : ''} ${i < currentStepIndex ? 'done' : ''}`}
              onClick={() => goToStep(i)}
              aria-label={`Go to step ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

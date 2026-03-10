import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { TOUR_FLOWS } from './tourFlows'

const STORAGE_KEY = 'swm_guided_tour'

const GuidedTourContext = createContext(null)

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return { enabled: false, completedTours: [] }
}

function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch { /* ignore */ }
}

export function GuidedTourProvider({ children }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [enabled, setEnabled] = useState(() => loadState().enabled)
  const [activeTourId, setActiveTourId] = useState(null)
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [completedTours, setCompletedTours] = useState(() => loadState().completedTours || [])
  const [launcherOpen, setLauncherOpen] = useState(false)
  const [targetRect, setTargetRect] = useState(null)
  const observerRef = useRef(null)
  const retryTimerRef = useRef(null)

  const activeTour = activeTourId ? TOUR_FLOWS.find(f => f.id === activeTourId) : null
  const currentStep = activeTour?.steps?.[currentStepIndex] || null
  const totalSteps = activeTour?.steps?.length || 0
  const isRunning = !!activeTour && !!currentStep

  // Persist enabled + completedTours
  useEffect(() => {
    saveState({ enabled, completedTours })
  }, [enabled, completedTours])

  // Find and highlight target element
  const findTarget = useCallback(() => {
    if (!currentStep) { setTargetRect(null); return }

    const trySelector = (selector) => {
      if (!selector) return null
      try { return document.querySelector(selector) } catch { return null }
    }

    let el = trySelector(currentStep.target)
    if (!el && currentStep.fallbackTarget) {
      el = trySelector(currentStep.fallbackTarget)
    }
    // Fallback to page content area
    if (!el) {
      el = trySelector('.app-main > div')
    }

    if (el) {
      const rect = el.getBoundingClientRect()
      setTargetRect({
        top: rect.top + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
        height: rect.height,
        viewportTop: rect.top,
        viewportLeft: rect.left,
      })

      // Scroll into view if off-screen
      if (rect.top < 0 || rect.bottom > window.innerHeight) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    } else {
      setTargetRect(null)
    }
  }, [currentStep])

  // Navigate to step route and find target
  useEffect(() => {
    if (!currentStep) return

    if (currentStep.route && location.pathname !== currentStep.route) {
      navigate(currentStep.route)
      // Wait for page to render, then find target
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current)
      retryTimerRef.current = setTimeout(() => findTarget(), 600)
    } else {
      // Already on the right page, find target after a short delay
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current)
      retryTimerRef.current = setTimeout(() => findTarget(), 200)
    }

    return () => {
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current)
    }
  }, [currentStep, location.pathname, navigate, findTarget])

  // Re-calculate rect on scroll/resize
  useEffect(() => {
    if (!isRunning) return

    const handleUpdate = () => findTarget()
    window.addEventListener('scroll', handleUpdate, true)
    window.addEventListener('resize', handleUpdate)
    return () => {
      window.removeEventListener('scroll', handleUpdate, true)
      window.removeEventListener('resize', handleUpdate)
    }
  }, [isRunning, findTarget])

  // Watch for DOM changes (lazy-loaded content)
  useEffect(() => {
    if (!isRunning) return

    if (observerRef.current) observerRef.current.disconnect()
    observerRef.current = new MutationObserver(() => {
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current)
      retryTimerRef.current = setTimeout(() => findTarget(), 300)
    })
    observerRef.current.observe(document.body, { childList: true, subtree: true })

    return () => {
      if (observerRef.current) observerRef.current.disconnect()
    }
  }, [isRunning, findTarget])

  const toggleEnabled = useCallback((val) => {
    const next = typeof val === 'boolean' ? val : !enabled
    setEnabled(next)
    if (!next) {
      setActiveTourId(null)
      setCurrentStepIndex(0)
      setTargetRect(null)
      setLauncherOpen(false)
    }
  }, [enabled])

  const startTour = useCallback((tourId) => {
    const tour = TOUR_FLOWS.find(f => f.id === tourId)
    if (!tour) return
    setActiveTourId(tourId)
    setCurrentStepIndex(0)
    setLauncherOpen(false)
    setEnabled(true)
  }, [])

  const stopTour = useCallback(() => {
    setActiveTourId(null)
    setCurrentStepIndex(0)
    setTargetRect(null)
  }, [])

  const nextStep = useCallback(() => {
    if (!activeTour) return
    if (currentStepIndex < totalSteps - 1) {
      setCurrentStepIndex(prev => prev + 1)
    } else {
      // Tour completed
      setCompletedTours(prev => {
        if (prev.includes(activeTourId)) return prev
        return [...prev, activeTourId]
      })
      stopTour()
    }
  }, [activeTour, currentStepIndex, totalSteps, activeTourId, stopTour])

  const prevStep = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1)
    }
  }, [currentStepIndex])

  const goToStep = useCallback((index) => {
    if (activeTour && index >= 0 && index < totalSteps) {
      setCurrentStepIndex(index)
    }
  }, [activeTour, totalSteps])

  const toggleLauncher = useCallback(() => {
    setLauncherOpen(prev => !prev)
  }, [])

  const isTourCompleted = useCallback((tourId) => {
    return completedTours.includes(tourId)
  }, [completedTours])

  const resetProgress = useCallback(() => {
    setCompletedTours([])
    stopTour()
  }, [stopTour])

  const value = {
    // State
    enabled,
    isRunning,
    activeTour,
    activeTourId,
    currentStep,
    currentStepIndex,
    totalSteps,
    targetRect,
    launcherOpen,
    completedTours,
    // Actions
    toggleEnabled,
    startTour,
    stopTour,
    nextStep,
    prevStep,
    goToStep,
    toggleLauncher,
    isTourCompleted,
    resetProgress,
  }

  return (
    <GuidedTourContext.Provider value={value}>
      {children}
    </GuidedTourContext.Provider>
  )
}

export function useGuidedTour() {
  const ctx = useContext(GuidedTourContext)
  if (!ctx) {
    throw new Error('useGuidedTour must be used within GuidedTourProvider')
  }
  return ctx
}

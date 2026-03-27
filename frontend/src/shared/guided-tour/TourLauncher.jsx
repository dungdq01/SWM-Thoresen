import { useState } from 'react'
import {
  BookOpen, X, Play, CheckCircle2, Clock, ChevronRight,
  Settings, ArrowDownToLine, ArrowUpFromLine, Warehouse,
  FileText, BarChart3, RotateCcw, Sparkles,
} from 'lucide-react'
import { useGuidedTour } from './GuidedTourProvider'
import { TOUR_FLOWS, TOUR_CATEGORIES } from './tourFlows'

const CATEGORY_ICONS = {
  setup: Settings,
  inbound: ArrowDownToLine,
  outbound: ArrowUpFromLine,
  warehouse: Warehouse,
  billing: FileText,
  reporting: BarChart3,
}

export function TourLauncher() {
  const {
    enabled,
    toggleEnabled,
    launcherOpen,
    toggleLauncher,
    startTour,
    isRunning,
    isTourCompleted,
    completedTours,
    resetProgress,
  } = useGuidedTour()

  const [selectedCategory, setSelectedCategory] = useState(null)

  if (isRunning) return null

  const filteredFlows = selectedCategory
    ? TOUR_FLOWS.filter(f => f.category === selectedCategory)
    : TOUR_FLOWS

  const totalFlows = TOUR_FLOWS.length
  const completedCount = completedTours.length

  return (
    <>
      {/* Trigger button in header */}
      <button
        onClick={toggleLauncher}
        className={`
          flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium
          transition-all duration-200 shadow-card
          ${enabled
            ? 'border-sky-300 bg-sky-50 text-sky-700 hover:bg-sky-100'
            : 'border-moon-300 bg-white text-navy-600 hover:border-sky-300 hover:text-sky-600'
          }
        `}
        title="Hướng dẫn sử dụng"
      >
        <BookOpen className="h-4 w-4" />
        <span className="hidden lg:inline">Guide</span>
        {completedCount > 0 && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-sky-500 px-1 text-[10px] font-bold text-white">
            {completedCount}/{totalFlows}
          </span>
        )}
      </button>

      {/* Launcher panel */}
      {launcherOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-[9990] bg-black/20 backdrop-blur-sm"
            onClick={toggleLauncher}
          />

          {/* Panel */}
          <div className="fixed right-2 sm:right-4 top-[72px] z-[9991] w-[calc(100vw-1rem)] sm:w-[380px] md:w-[420px] max-h-[calc(100vh-96px)] max-h-[calc(100dvh-96px)] overflow-hidden rounded-2xl border border-moon-200 bg-white shadow-2xl animate-in slide-in-from-top-2 duration-200">
            {/* Panel header */}
            <div className="border-b border-moon-200 bg-gradient-to-r from-navy-800 to-navy-900 px-5 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/20">
                    <Sparkles className="h-5 w-5 text-sky-400" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-white">SWM Smart Guide</h2>
                    <p className="text-xs text-slate-400">Hướng dẫn sử dụng tương tác</p>
                  </div>
                </div>
                <button
                  onClick={toggleLauncher}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Progress */}
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                  <span>Tiến trình tổng thể</span>
                  <span>{completedCount}/{totalFlows} flows</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-sky-400 to-emerald-400 transition-all duration-500"
                    style={{ width: `${totalFlows > 0 ? (completedCount / totalFlows) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Category tabs */}
            <div className="flex items-center gap-1 overflow-x-auto border-b border-moon-200 px-3 py-2 scrollbar-none">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  !selectedCategory
                    ? 'bg-navy-800 text-white'
                    : 'text-navy-500 hover:bg-moon-100'
                }`}
              >
                Tất cả
              </button>
              {TOUR_CATEGORIES.map(cat => {
                const Icon = CATEGORY_ICONS[cat.id] || Settings
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                      selectedCategory === cat.id
                        ? 'bg-navy-800 text-white'
                        : 'text-navy-500 hover:bg-moon-100'
                    }`}
                  >
                    <Icon className="h-3 w-3" />
                    <span>{cat.label}</span>
                  </button>
                )
              })}
            </div>

            {/* Flow list */}
            <div className="overflow-y-auto max-h-[calc(100vh-320px)] max-h-[calc(100dvh-320px)] p-3 space-y-2">
              {filteredFlows.map(flow => {
                const completed = isTourCompleted(flow.id)
                return (
                  <button
                    key={flow.id}
                    onClick={() => startTour(flow.id)}
                    className={`group w-full text-left rounded-xl border p-3.5 transition-all duration-200 ${
                      completed
                        ? 'border-emerald-200 bg-emerald-50/50 hover:border-emerald-300'
                        : 'border-moon-200 bg-white hover:border-sky-300 hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                        completed
                          ? 'bg-emerald-100 text-emerald-600'
                          : 'bg-sky-50 text-sky-600 group-hover:bg-sky-100'
                      }`}>
                        {completed ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-semibold text-navy-900 truncate">
                            {flow.title}
                          </h3>
                          {completed && (
                            <span className="shrink-0 text-[10px] font-bold text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded-full">
                              DONE
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-navy-500 line-clamp-2">
                          {flow.description}
                        </p>
                        <div className="mt-2 flex items-center gap-3 text-[11px] text-navy-400">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            ~{flow.estimatedMinutes} phút
                          </span>
                          <span>•</span>
                          <span>{flow.steps.length} bước</span>
                          <span>•</span>
                          <span className="font-medium text-navy-500">{flow.role}</span>
                        </div>
                      </div>

                      <ChevronRight className="h-4 w-4 shrink-0 text-navy-300 group-hover:text-sky-500 transition-colors mt-1" />
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Footer */}
            <div className="border-t border-moon-200 px-3 sm:px-4 py-3 flex items-center justify-between">
              <button
                onClick={resetProgress}
                className="flex items-center gap-1.5 text-xs text-navy-400 hover:text-navy-600 transition-colors"
                title="Reset tiến trình"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Reset</span>
              </button>

              <div className="hidden sm:flex items-center gap-2 text-xs text-navy-500">
                <span>Phím tắt:</span>
                <kbd className="rounded border border-moon-300 bg-moon-100 px-1.5 py-0.5 text-[10px] font-mono">←</kbd>
                <kbd className="rounded border border-moon-300 bg-moon-100 px-1.5 py-0.5 text-[10px] font-mono">→</kbd>
                <kbd className="rounded border border-moon-300 bg-moon-100 px-1.5 py-0.5 text-[10px] font-mono">Esc</kbd>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}

import { memo, useState, useEffect } from 'react'

export const LoadingScreen = memo(function LoadingScreen() {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 2500)
    return () => clearTimeout(timer)
  }, [])

  if (!visible) return null

  return (
    <div className="absolute inset-0 pointer-events-auto bg-[#0a0e1a] flex flex-col items-center justify-center z-50 transition-opacity duration-500"
      style={{ opacity: visible ? 1 : 0 }}
    >
      <div className="w-12 h-12 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-4" />
      <div className="text-sm font-medium text-white/60">Đang tải mô hình 3D...</div>
      <div className="text-[10px] text-white/30 mt-1">SWM Thoresen Vinama Logistics</div>
    </div>
  )
})

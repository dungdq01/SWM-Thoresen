import { memo } from 'react'
import { TICKER_ITEMS } from '../data/tickerData'

export const ActivityTicker = memo(function ActivityTicker() {
  return (
    <div className="absolute bottom-0 left-0 right-0 pointer-events-none">
      <div className="bg-black/60 backdrop-blur-sm border-t border-white/5 px-4 py-2">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[10px] font-bold text-red-400 uppercase">Live</span>
          </div>
          <div className="flex gap-6 animate-[scroll_30s_linear_infinite] whitespace-nowrap">
            {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
              <span key={i} className="text-[11px] text-white/50">
                <span className="text-white/30">{item.time}</span>
                {' '}
                <span className={`px-1 py-0.5 rounded text-[9px] font-medium ${
                  item.type === 'inbound' ? 'bg-emerald-500/20 text-emerald-400' :
                  item.type === 'outbound' ? 'bg-amber-500/20 text-amber-400' :
                  item.type === 'alert' ? 'bg-red-500/20 text-red-400' :
                  'bg-blue-500/20 text-blue-400'
                }`}>{item.tag}</span>
                {' '}
                {item.message}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
})

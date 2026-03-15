import { motion } from 'framer-motion'
import { useScrollAnimation } from '@shared/hooks/useScrollAnimation'
import { ShoppingBag, Store, Truck, Package, Building2, Factory, Globe2, Settings, Zap, Box } from 'lucide-react'

const partners = [
  { name: 'Shopee',          icon: ShoppingBag, color: 'text-orange-500' },
  { name: 'Lazada',          icon: Store,       color: 'text-purple-500' },
  { name: 'Giao Hàng Nhanh', icon: Truck,       color: 'text-red-500'   },
  { name: 'Viettel Post',    icon: Package,     color: 'text-red-600'   },
  { name: 'J&T Express',     icon: Truck,       color: 'text-red-400'   },
  { name: 'Tiki',            icon: Building2,   color: 'text-sky-500'   },
  { name: 'GHTK',            icon: Truck,       color: 'text-green-600' },
  { name: 'SAP',             icon: Factory,     color: 'text-blue-600'  },
  { name: 'Odoo',            icon: Settings,    color: 'text-purple-600'},
  { name: 'DHL',             icon: Globe2,      color: 'text-yellow-600'},
  { name: 'Sendo',           icon: ShoppingBag, color: 'text-red-500'   },
  { name: 'Vnpost',          icon: Box,         color: 'text-yellow-500'},
]

// Double the list for seamless infinite marquee
const allPartners = [...partners, ...partners]

export function PartnersSection() {
  const { ref, isVisible } = useScrollAnimation(0.2)

  return (
    <section ref={ref} className="py-16 bg-white border-y border-navy-100 overflow-hidden">
      <style>{`
        @keyframes marquee {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .marquee-track {
          animation: marquee 32s linear infinite;
          will-change: transform;
        }
        .marquee-track:hover {
          animation-play-state: paused;
        }
      `}</style>

      {/* Heading */}
      <div className="container-custom mb-10">
        <motion.p
          className="text-center text-sm font-medium text-navy-500 tracking-widest uppercase"
          initial={{ opacity: 0, y: 20 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
        >
          Được tin dùng bởi các tập đoàn hàng đầu
        </motion.p>
      </div>

      {/* Full-bleed marquee strip */}
      <div className="relative">
        {/* Fade edges */}
        <div className="absolute left-0 top-0 h-full w-24 pointer-events-none z-10"
          style={{ background: 'linear-gradient(to right, white, transparent)' }} />
        <div className="absolute right-0 top-0 h-full w-24 pointer-events-none z-10"
          style={{ background: 'linear-gradient(to left, white, transparent)' }} />

        <div className="marquee-track flex items-center" style={{ width: 'max-content' }}>
          {allPartners.map((partner, index) => {
            const Icon = partner.icon
            return (
              <div
                key={`${partner.name}-${index}`}
                className="flex flex-col items-center gap-2 px-8 py-2 group cursor-default select-none"
              >
                <div className="w-16 h-16 bg-moon-50 rounded-xl flex items-center justify-center
                                group-hover:bg-ice/10 group-hover:scale-110 transition-all duration-300">
                  <Icon className={`w-8 h-8 ${partner.color} opacity-60 group-hover:opacity-100 transition-opacity`} />
                </div>
                <span className="text-xs text-navy-400 font-medium whitespace-nowrap">
                  {partner.name}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

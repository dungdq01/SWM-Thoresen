import { motion } from 'framer-motion'
import { useScrollAnimation } from '@shared/hooks/useScrollAnimation'
import { Building2, Store, Truck, Package, ShoppingBag, Factory } from 'lucide-react'

const partners = [
  { name: 'Shopee', icon: ShoppingBag },
  { name: 'Lazada', icon: Store },
  { name: 'Giao Hàng Nhanh', icon: Truck },
  { name: 'Viettel Post', icon: Package },
  { name: 'J&T Express', icon: Truck },
  { name: 'Tiki', icon: Building2 },
]

export function PartnersSection() {
  const { ref, isVisible } = useScrollAnimation(0.2)

  return (
    <section ref={ref} className="py-16 bg-white border-y border-navy-100">
      <div className="container-custom">
        <motion.p 
          className="text-center text-sm font-medium text-navy-500 tracking-widest uppercase mb-10"
          initial={{ opacity: 0, y: 20 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
        >
          Được tin dùng bởi các tập đoàn hàng đầu
        </motion.p>

        <div className="flex flex-wrap justify-center items-center gap-8 md:gap-12 lg:gap-16">
          {partners.map((partner, index) => {
            const Icon = partner.icon
            return (
              <motion.div
                key={partner.name}
                initial={{ opacity: 0, y: 20 }}
                animate={isVisible ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="group flex flex-col items-center gap-2"
              >
                <div className="w-16 h-16 bg-slate-50 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:bg-primary-50 group-hover:scale-110">
                  <Icon className="w-8 h-8 text-navy-400 group-hover:text-primary-600 transition-colors" />
                </div>
                <span className="text-xs text-navy-400 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  {partner.name}
                </span>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

import { motion } from 'framer-motion'
import { useScrollAnimation } from '@shared/hooks/useScrollAnimation'
import { Shield, Headphones, Zap, Award } from 'lucide-react'

const stats = [
  { icon: Shield, value: '99.9%', label: 'Độ tin cậy' },
  { icon: Headphones, value: '24/7', label: 'Hỗ trợ' },
  { icon: Zap, value: '< 1s', label: 'Phản hồi' },
  { icon: Award, value: '500+', label: 'Khách hàng' },
]

export function WhyChooseUsSection() {
  const { ref, isVisible } = useScrollAnimation(0.2)

  return (
    <section ref={ref} className="relative overflow-hidden">
      <div className="bg-gradient-to-br from-primary-900 via-primary-800 to-navy-900 py-20 lg:py-28">
        <div className="container-custom">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={isVisible ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.7 }}
            >
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6">
                Tại sao doanh nghiệp chọn <span className="text-secondary-400">WMS Pro?</span>
              </h2>
              
              <p className="text-lg text-primary-100 mb-10 leading-relaxed">
                Chúng tôi không chỉ cung cấp phần mềm, mà còn đồng hành cùng doanh nghiệp 
                trong hành trình chuyển đổi số với đội ngũ chuyên gia giàu kinh nghiệm.
              </p>

              <div className="grid grid-cols-2 gap-6">
                {stats.map((stat, index) => {
                  const Icon = stat.icon
                  return (
                    <motion.div
                      key={stat.label}
                      className="flex items-center gap-4"
                      initial={{ opacity: 0, y: 20 }}
                      animate={isVisible ? { opacity: 1, y: 0 } : {}}
                      transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
                    >
                      <div className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center">
                        <Icon className="w-6 h-6 text-secondary-400" />
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-white">{stat.value}</div>
                        <div className="text-sm text-primary-200">{stat.label}</div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </motion.div>

            <motion.div
              className="relative"
              initial={{ opacity: 0, x: 50 }}
              animate={isVisible ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.7, delay: 0.2 }}
            >
              <div className="relative rounded-3xl overflow-hidden shadow-2xl">
                <div className="aspect-[4/3] bg-gradient-to-br from-secondary-400/20 to-primary-600/20 flex items-center justify-center">
                  <div className="grid grid-cols-2 gap-4 p-8">
                    {[1, 2, 3, 4].map((i) => (
                      <motion.div
                        key={i}
                        className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center"
                        whileHover={{ scale: 1.05, backgroundColor: 'rgba(255,255,255,0.2)' }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="w-12 h-12 bg-white/20 rounded-xl mx-auto mb-3 flex items-center justify-center">
                          <div className="w-6 h-6 bg-secondary-400 rounded-lg" />
                        </div>
                        <div className="h-2 bg-white/30 rounded w-3/4 mx-auto mb-2" />
                        <div className="h-2 bg-white/20 rounded w-1/2 mx-auto" />
                      </motion.div>
                    ))}
                  </div>
                </div>

                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
              </div>

              <motion.div
                className="absolute -bottom-6 -left-6 bg-white rounded-2xl shadow-xl p-4"
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              >
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 border-2 border-white" />
                    ))}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-navy-900">Đội ngũ hỗ trợ</p>
                    <p className="text-xs text-green-600">Đang trực tuyến</p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  )
}

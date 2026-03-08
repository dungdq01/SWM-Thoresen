import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Play, Users } from 'lucide-react'
import { Button } from '@shared/ui'

export function HeroSection() {
  const navigate = useNavigate()

  return (
    <section className="relative min-h-screen flex items-center pt-20 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-primary-50/30" />
      <div className="absolute top-20 right-0 w-96 h-96 bg-secondary-200/20 rounded-full blur-3xl" />
      <div className="absolute bottom-20 left-0 w-80 h-80 bg-primary-200/20 rounded-full blur-3xl" />
      
      <div className="container-custom relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="inline-flex items-center gap-2 bg-primary-50 text-primary-700 px-4 py-2 rounded-full text-sm font-medium mb-6"
            >
              <span className="w-2 h-2 bg-primary-500 rounded-full animate-pulse" />
              Mới: Tích hợp AI dự báo tồn kho
            </motion.div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-navy-900 leading-tight mb-6">
              Giải pháp Quản lý{' '}
              <span className="text-primary-600">Kho Thông minh</span>{' '}
              cho{' '}
              <span className="relative">
                <span className="relative z-10">Doanh nghiệp Việt</span>
                <motion.span 
                  className="absolute bottom-2 left-0 right-0 h-3 bg-secondary-300/40 -z-0"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.6, delay: 0.8 }}
                />
              </span>
            </h1>

            <p className="text-lg text-navy-600 mb-8 leading-relaxed max-w-xl">
              Tối ưu hóa quy trình vận hành, kiểm soát tồn kho thời gian thực và 
              nâng cao hiệu suất chuỗi cung ứng với công nghệ đám mây tiên tiến nhất hiện nay.
            </p>

            <div className="flex flex-wrap gap-4 mb-8">
              <Button 
                variant="gold" 
                size="lg"
                icon={<ArrowRight className="w-5 h-5" />}
                iconPosition="right"
                onClick={() => navigate('/app')}
              >
                Vào dashboard
              </Button>
              <Button 
                variant="ghost" 
                size="lg"
                icon={<Play className="w-5 h-5" />}
                onClick={() => navigate('/app')}
              >
                Xem bản Demo
              </Button>
            </div>

            <motion.div 
              className="flex items-center gap-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.6 }}
            >
              <div className="flex -space-x-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 border-2 border-white flex items-center justify-center"
                  >
                    <Users className="w-5 h-5 text-white" />
                  </div>
                ))}
              </div>
              <p className="text-sm text-navy-600">
                <span className="font-semibold text-navy-900">Hơn 500+</span> doanh nghiệp đã tin dùng
              </p>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="relative"
          >
            <div className="relative bg-gradient-to-br from-secondary-500 to-secondary-600 rounded-3xl p-6 shadow-soft-xl">
              <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                <div className="bg-navy-800 px-4 py-3 flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <div className="w-3 h-3 rounded-full bg-yellow-400" />
                    <div className="w-3 h-3 rounded-full bg-green-400" />
                  </div>
                  <span className="text-white/70 text-xs ml-2">WMS Dashboard(mockup)</span>
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-navy-600">Tổng quan kho hàng</span>
                    <span className="text-primary-600 font-medium">Hôm nay</span>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: 'Tồn kho', value: '12,450', valueClass: 'text-primary-600' },
                      { label: 'Nhập kho', value: '340', valueClass: 'text-success' },
                      { label: 'Xuất kho', value: '285', valueClass: 'text-warning' },
                    ].map((stat) => (
                      <div key={stat.label} className="bg-slate-50 rounded-lg p-3 text-center">
                        <div className={`text-lg font-bold ${stat.valueClass}`}>
                          {stat.value}
                        </div>
                        <div className="text-xs text-navy-500">{stat.label}</div>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg">
                        <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center text-primary-600 text-xs font-bold">
                          {i}
                        </div>
                        <div className="flex-1">
                          <div className="h-2 bg-navy-200 rounded w-3/4" />
                          <div className="h-2 bg-navy-100 rounded w-1/2 mt-1" />
                        </div>
                        <div className="text-xs text-green-600 font-medium">Hoàn thành</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <motion.div 
              className="absolute -bottom-6 -left-6 bg-white rounded-2xl shadow-soft-lg p-4 border border-navy-100"
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-navy-900">Đã nhập kho</p>
                  <p className="text-xs text-navy-500">+240 Sản phẩm</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

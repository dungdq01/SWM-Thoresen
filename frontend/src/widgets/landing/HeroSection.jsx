import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Play, Warehouse, TrendingUp, Shield, Globe } from 'lucide-react'
import { Button } from '@shared/ui'

export function HeroSection() {
  const navigate = useNavigate()

  return (
    <>
      {/* Hero Section - Prologis Style */}
      <section className="relative min-h-[90vh] flex items-center overflow-hidden bg-navy-900">
        {/* Background Video/Image Overlay */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-r from-navy-900 via-navy-900/95 to-navy-900/70 z-10" />
          <div 
            className="absolute inset-0 bg-cover bg-center opacity-40"
            style={{ 
              backgroundImage: 'url("https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80")',
            }}
          />
        </div>

        {/* Geometric Pattern Overlay */}
        <div className="absolute inset-0 z-10 opacity-10">
          <div className="absolute top-0 right-0 w-1/2 h-full">
            <svg viewBox="0 0 400 800" className="w-full h-full">
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-ice" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>
          </div>
        </div>
        
        <div className="container-custom relative z-20 pt-24">
          <div className="max-w-4xl">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              {/* Tagline */}
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="text-ice font-medium tracking-widest uppercase text-sm mb-6"
              >
                Beyond The Warehouse
              </motion.p>

              {/* Main Headline */}
              <h1 className="text-4xl md:text-5xl lg:text-7xl font-bold text-white leading-[1.1] mb-8">
                Nâng tầm <span className="text-ice">Logistics</span>,
                <br />
                Kiến tạo <span className="text-ice-light">Chuỗi Cung Ứng</span> Bền Vững
              </h1>

              {/* Subtitle */}
              <p className="text-xl md:text-2xl text-moon-200 mb-10 leading-relaxed max-w-2xl font-light">
                Chúng tôi đưa logistics đi xa hơn, vận hành một chuỗi cung ứng toàn cầu 
                mạnh mẽ, thông minh và linh hoạt hơn bao giờ hết.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-wrap gap-4 mb-16">
                <Button 
                  variant="accent" 
                  size="lg"
                  icon={<ArrowRight className="w-5 h-5" />}
                  iconPosition="right"
                  onClick={() => navigate('/app')}
                  className="px-8 py-4 text-base"
                >
                  Khám phá giải pháp
                </Button>
                <Button
                  variant="outline-light"
                  size="lg"
                  icon={<Play className="w-5 h-5" />}
                  onClick={() => navigate('/app')}
                  className="px-8 py-4 text-base"
                >
                  Xem video giới thiệu
                </Button>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <motion.div 
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20"
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <div className="w-6 h-10 border-2 border-white/30 rounded-full flex justify-center pt-2">
            <div className="w-1.5 h-3 bg-ice rounded-full" />
          </div>
        </motion.div>
      </section>

      {/* Stats Section - Prologis Style */}
      <section className="relative bg-white py-20 -mt-16 z-30">
        <div className="container-custom">
          <motion.div 
            className="bg-white rounded-2xl shadow-2xl border border-moon-100 p-8 md:p-12"
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <div className="grid md:grid-cols-4 gap-8 md:gap-12">
              {[
                { value: '500+', label: 'Khách hàng doanh nghiệp', icon: Warehouse },
                { value: '2M+', label: 'm² diện tích kho quản lý', icon: Globe },
                { value: '15+', label: 'Năm kinh nghiệm logistics', icon: TrendingUp },
                { value: '99.9%', label: 'Độ chính xác tồn kho', icon: Shield },
              ].map((stat, index) => (
                <motion.div 
                  key={stat.label}
                  className="text-center md:text-left group"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <div className="flex items-center justify-center md:justify-start gap-3 mb-3">
                    <stat.icon className="w-6 h-6 text-ice" />
                    <span className="text-4xl md:text-5xl font-bold text-navy-900">{stat.value}</span>
                  </div>
                  <p className="text-navy-500 font-medium">{stat.label}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>
    </>
  )
}

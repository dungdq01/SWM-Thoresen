import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useScrollAnimation } from '@shared/hooks/useScrollAnimation'
import { Button } from '@shared/ui'
import { ArrowRight, Phone, MapPin } from 'lucide-react'

export function CTASection() {
  const { ref, isVisible } = useScrollAnimation(0.2)
  const navigate = useNavigate()

  return (
    <section ref={ref} className="relative overflow-hidden">
      {/* Dark CTA Section - Prologis Style */}
      <div className="relative bg-navy-900 py-24 lg:py-32">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{ 
              backgroundImage: 'url("https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80")',
            }}
          />
        </div>
        
        {/* Geometric Accent */}
        <div className="absolute right-0 top-0 w-1/3 h-full bg-gradient-to-l from-ice/10 to-transparent" />
        
        <div className="container-custom relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={isVisible ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.7 }}
            >
              <p className="text-ice font-semibold tracking-widest uppercase text-sm mb-4">
                Bắt đầu ngay hôm nay
              </p>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight">
                Sẵn sàng đưa logistics của bạn đi xa hơn?
              </h2>
              <p className="text-xl text-moon-200 mb-10 leading-relaxed">
                Doanh nghiệp của bạn cần kinh nghiệm, chuyên môn và phương pháp tiếp cận 
                dựa trên dữ liệu với đội ngũ tận tâm hiểu rõ ngành của bạn.
              </p>

              <div className="flex flex-wrap gap-4">
                <Button 
                  variant="accent" 
                  size="lg"
                  icon={<ArrowRight className="w-5 h-5" />}
                  iconPosition="right"
                  onClick={() => navigate('/app')}
                  className="px-8"
                >
                  Khám phá SmartLog
                </Button>
                <a href="tel:1900123456">
                  <Button 
                    variant="outline" 
                    size="lg"
                    icon={<Phone className="w-5 h-5" />}
                    className="border-white/30 text-white hover:bg-white/10 hover:border-white/50 px-8"
                  >
                    Liên hệ tư vấn
                  </Button>
                </a>
              </div>
            </motion.div>

            {/* Right Content - Contact Card */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={isVisible ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="lg:pl-12"
            >
              <div className="bg-white rounded-2xl p-8 shadow-2xl">
                <h3 className="text-xl font-bold text-navy-900 mb-6">
                  Liên hệ với chúng tôi
                </h3>
                
                <div className="space-y-4 mb-8">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-ice/10 flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-5 h-5 text-ice" />
                    </div>
                    <div>
                      <p className="font-medium text-navy-900">Văn phòng chính</p>
                      <p className="text-navy-500 text-sm">Tầng 15, Tòa nhà Landmark 81, TP.HCM</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-ice/10 flex items-center justify-center flex-shrink-0">
                      <Phone className="w-5 h-5 text-ice" />
                    </div>
                    <div>
                      <p className="font-medium text-navy-900">Hotline</p>
                      <p className="text-navy-500 text-sm">1900 123 456 (24/7)</p>
                    </div>
                  </div>
                </div>

                <Button 
                  variant="accent" 
                  className="w-full"
                  onClick={() => navigate('/app')}
                >
                  Đăng ký dùng thử miễn phí
                </Button>
                <p className="text-center text-sm text-navy-400 mt-4">
                  14 ngày dùng thử · Không cần thẻ tín dụng
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  )
}

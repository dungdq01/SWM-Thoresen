import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useScrollAnimation } from '@shared/hooks/useScrollAnimation'
import { Button } from '@shared/ui'
import { ArrowRight, Phone } from 'lucide-react'

export function CTASection() {
  const { ref, isVisible } = useScrollAnimation(0.2)
  const navigate = useNavigate()

  return (
    <section ref={ref} className="section-padding bg-white">
      <div className="container-custom">
        <motion.div 
          className="relative bg-slate-50 rounded-3xl p-8 md:p-12 lg:p-16 overflow-hidden"
          initial={{ opacity: 0, y: 30 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary-100 rounded-full blur-3xl opacity-50 -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-secondary-100 rounded-full blur-3xl opacity-50 translate-y-1/2 -translate-x-1/2" />
          
          <div className="relative z-10 text-center max-w-2xl mx-auto">
            <motion.h2 
              className="text-3xl md:text-4xl lg:text-5xl font-bold text-navy-900 mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={isVisible ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              Sẵn sàng nâng tầm quản lý kho của bạn?
            </motion.h2>
            
            <motion.p 
              className="text-lg text-navy-600 mb-10 leading-relaxed"
              initial={{ opacity: 0, y: 20 }}
              animate={isVisible ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              Bắt đầu dùng thử miễn phí 14 ngày. Không cần thẻ tín dụng. 
              Cài đặt chỉ trong vài phút.
            </motion.p>

            <motion.div 
              className="flex flex-wrap justify-center gap-4"
              initial={{ opacity: 0, y: 20 }}
              animate={isVisible ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <Button 
                variant="gold" 
                size="lg"
                icon={<ArrowRight className="w-5 h-5" />}
                iconPosition="right"
                onClick={() => navigate('/app')}
              >
                Đi tới ứng dụng
              </Button>
              <a href="tel:1900123456">
                <Button 
                  variant="secondary" 
                  size="lg"
                  icon={<Phone className="w-5 h-5" />}
                >
                  Liên hệ bộ phận tư vấn
                </Button>
              </a>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

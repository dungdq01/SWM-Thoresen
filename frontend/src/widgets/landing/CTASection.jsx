import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useScrollAnimation } from '@shared/hooks/useScrollAnimation'
import { Button } from '@shared/ui'
import { ArrowRight, Phone } from 'lucide-react'

export function CTASection() {
  const { ref, isVisible } = useScrollAnimation(0.2)
  const navigate = useNavigate()

  return (
    <section ref={ref} className="relative overflow-hidden">
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
                    variant="outline-light"
                    size="lg"
                    icon={<Phone className="w-5 h-5" />}
                    className="px-8"
                  >
                    Liên hệ tư vấn
                  </Button>
                </a>
              </div>
            </motion.div>

            {/* Right Content — Lead Capture Form */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={isVisible ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="lg:pl-12"
            >
              <div className="bg-white rounded-2xl p-8 shadow-2xl">
                <h3 className="text-xl font-bold text-navy-900 mb-2">
                  Nhận demo miễn phí
                </h3>
                <p className="text-sm text-navy-500 mb-6">
                  Đội ngũ SmartLog sẽ liên hệ trong vòng 2 giờ làm việc.
                </p>

                <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
                  <div>
                    <label className="block text-sm font-medium text-navy-700 mb-1.5">
                      Họ và tên
                    </label>
                    <input
                      type="text"
                      placeholder="Nguyễn Văn A"
                      className="w-full h-11 rounded-xl border border-moon-200 px-4 text-sm text-navy-900
                                 placeholder:text-navy-400 focus:outline-none focus:ring-2 focus:ring-ice/30
                                 focus:border-ice transition-colors bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-navy-700 mb-1.5">
                      Công ty
                    </label>
                    <input
                      type="text"
                      placeholder="Tên doanh nghiệp của bạn"
                      className="w-full h-11 rounded-xl border border-moon-200 px-4 text-sm text-navy-900
                                 placeholder:text-navy-400 focus:outline-none focus:ring-2 focus:ring-ice/30
                                 focus:border-ice transition-colors bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-navy-700 mb-1.5">
                      Số điện thoại
                    </label>
                    <input
                      type="tel"
                      placeholder="0901 234 567"
                      className="w-full h-11 rounded-xl border border-moon-200 px-4 text-sm text-navy-900
                                 placeholder:text-navy-400 focus:outline-none focus:ring-2 focus:ring-ice/30
                                 focus:border-ice transition-colors bg-white"
                    />
                  </div>

                  <Button
                    variant="accent"
                    className="w-full mt-2"
                    type="submit"
                    icon={<ArrowRight className="w-4 h-4" />}
                    iconPosition="right"
                  >
                    Nhận demo miễn phí
                  </Button>
                </form>

                <p className="text-center text-xs text-navy-400 mt-4">
                  Miễn phí 14 ngày · Không cần thẻ tín dụng · Hủy bất kỳ lúc nào
                </p>
              </div>
            </motion.div>

          </div>
        </div>
      </div>
    </section>
  )
}

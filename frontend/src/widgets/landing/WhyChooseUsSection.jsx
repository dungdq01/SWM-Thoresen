import { motion } from 'framer-motion'
import { useScrollAnimation } from '@shared/hooks/useScrollAnimation'
import { ArrowRight, Plug, Activity, ShieldCheck, Headphones } from 'lucide-react'

const capabilities = [
  {
    icon: Plug,
    title: 'Tích hợp Đa nền tảng',
    description: 'Kết nối liền mạch với SAP, Oracle, Odoo và các sàn TMĐT lớn (Shopee, Lazada, Tiki), đơn vị vận chuyển (GHN, GHTK, J&T) qua API chuẩn hóa.',
    link: '#',
  },
  {
    icon: Activity,
    title: 'Vận hành Thời gian thực',
    description: 'Dashboard trực tiếp cập nhật tồn kho, vị trí hàng hóa và trạng thái đơn hàng theo từng giây — không độ trễ, không sai lệch dữ liệu.',
    link: '#',
  },
  {
    icon: ShieldCheck,
    title: 'Bảo mật Doanh nghiệp',
    description: 'Phân quyền theo vai trò (RBAC), nhật ký kiểm toán đầy đủ, mã hóa AES-256 và tuân thủ tiêu chuẩn ISO 27001 cho mọi dữ liệu kho.',
    link: '#',
  },
  {
    icon: Headphones,
    title: 'Hỗ trợ 24/7',
    description: 'Đội ngũ chuyên gia logistics túc trực, SLA 99.9% uptime, thời gian phản hồi dưới 2 giờ và onboarding tận tâm cho mỗi khách hàng.',
    link: '#',
  },
]

export function WhyChooseUsSection() {
  const { ref, isVisible } = useScrollAnimation(0.2)

  return (
    <section id="about" ref={ref} className="py-24 bg-white">
      <div className="container-custom">
        {/* Section Header */}
        <motion.div 
          className="mb-16"
          initial={{ opacity: 0, y: 30 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <p className="text-ice font-semibold tracking-widest uppercase text-sm mb-4">
            Cùng nhau tiến xa hơn
          </p>
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div className="max-w-2xl">
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-navy-900 leading-tight mb-4">
                Doanh nghiệp của bạn cần <span className="text-ice">chuyên môn</span> và <span className="text-ice">kinh nghiệm</span>
              </h2>
              <p className="text-lg text-navy-600">
                Phương pháp tiếp cận dựa trên dữ liệu với đội ngũ tận tâm hiểu rõ ngành của bạn.
              </p>
            </div>
            <a 
              href="#learn-more" 
              className="inline-flex items-center gap-2 text-navy-700 font-medium hover:text-ice transition-colors group"
            >
              Tìm hiểu về SmartLog
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </a>
          </div>
        </motion.div>

        {/* Capabilities Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {capabilities.map((item, index) => {
            const Icon = item.icon
            return (
              <motion.a
                key={item.title}
                href={item.link}
                className="group relative bg-moon-50 rounded-2xl p-8 hover:bg-navy-900 transition-all duration-500"
                initial={{ opacity: 0, y: 30 }}
                animate={isVisible ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <div className="flex items-start gap-6">
                  <div className="w-14 h-14 rounded-xl bg-white group-hover:bg-ice/20 flex items-center justify-center flex-shrink-0 transition-colors duration-500">
                    <Icon className="w-7 h-7 text-ice" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-navy-900 group-hover:text-white mb-3 transition-colors duration-500">
                      {item.title}
                    </h3>
                    <p className="text-navy-600 group-hover:text-moon-200 leading-relaxed mb-4 transition-colors duration-500">
                      {item.description}
                    </p>
                    <div className="flex items-center gap-2 text-ice font-medium text-sm">
                      Tìm hiểu thêm
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </div>
              </motion.a>
            )
          })}
        </div>
      </div>
    </section>
  )
}

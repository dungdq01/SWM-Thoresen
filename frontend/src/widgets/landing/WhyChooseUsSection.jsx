import { motion } from 'framer-motion'
import { useScrollAnimation } from '@shared/hooks/useScrollAnimation'
import { ArrowRight, Building2, Users, Globe2, Leaf } from 'lucide-react'

const capabilities = [
  {
    icon: Building2,
    title: 'Vận hành Bất động sản',
    description: 'Tại hiện trường và mọi nơi bạn cần, chúng tôi là đội ngũ đáng tin cậy, mang đến giải pháp tùy chỉnh và hỗ trợ 24/7.',
    link: '#',
  },
  {
    icon: Users,
    title: 'Phát triển Nhân lực',
    description: 'Đào tạo lực lượng logistics tương lai và nâng cao kỹ năng nhân viên hiện tại với các chương trình chuyên biệt.',
    link: '#',
  },
  {
    icon: Globe2,
    title: 'Chiến lược Toàn cầu',
    description: 'Với thành tích đã được chứng minh và vị thế dẫn đầu ngành, chúng tôi mang lại giá trị vượt trội cho khách hàng.',
    link: '#',
  },
  {
    icon: Leaf,
    title: 'Bền vững & Môi trường',
    description: 'Chúng tôi hành động có ý nghĩa để hỗ trợ mục tiêu của khách hàng và bảo vệ hành tinh cho thế hệ tương lai.',
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

import { motion } from 'framer-motion'
import { useScrollAnimation } from '@shared/hooks/useScrollAnimation'
import { ArrowRight, Warehouse, BarChart3, Zap, Truck, Package, Settings } from 'lucide-react'

const solutions = [
  {
    icon: Warehouse,
    title: 'Quản lý Kho',
    description: 'Giải phóng tiềm năng kho hàng với giải pháp tích hợp, tối ưu hóa hiệu suất và năng suất.',
    link: '#',
    image: 'https://images.unsplash.com/photo-1553413077-190dd305871c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
  },
  {
    icon: Truck,
    title: 'Vận hành Logistics',
    description: 'Kiểm soát toàn diện chuỗi cung ứng từ nhập kho, lưu trữ đến xuất kho với độ chính xác cao.',
    link: '#',
    image: 'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
  },
  {
    icon: BarChart3,
    title: 'Phân tích & Báo cáo',
    description: 'Đưa ra quyết định dựa trên dữ liệu với hệ thống báo cáo thông minh và dashboard trực quan.',
    link: '#',
    image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
  },
  {
    icon: Zap,
    title: 'Năng lượng & Bền vững',
    description: 'Cải thiện hiệu quả năng lượng và giảm chi phí với các giải pháp thân thiện môi trường.',
    link: '#',
    image: 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
  },
  {
    icon: Package,
    title: 'Kiểm soát Tồn kho',
    description: 'Theo dõi tồn kho thời gian thực với độ chính xác 99.9%, giảm thiểu sai lệch và thất thoát.',
    link: '#',
    image: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
  },
  {
    icon: Settings,
    title: 'Tích hợp Hệ thống',
    description: 'Kết nối mượt mà với ERP, sàn TMĐT và các hệ thống vận chuyển hàng đầu Việt Nam.',
    link: '#',
    image: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
  },
]

export function FeaturesSection() {
  const { ref, isVisible } = useScrollAnimation(0.1)

  return (
    <section id="solutions" ref={ref} className="py-24 bg-moon-50">
      <div className="container-custom">
        {/* Section Header - Prologis Style */}
        <motion.div 
          className="mb-16"
          initial={{ opacity: 0, y: 30 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <p className="text-ice font-semibold tracking-widest uppercase text-sm mb-4">
            Giải pháp toàn diện
          </p>
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-navy-900 leading-tight max-w-2xl">
              Khác biệt để <span className="text-ice">dẫn đầu</span> thành công
            </h2>
            <a 
              href="#all-solutions" 
              className="inline-flex items-center gap-2 text-navy-700 font-medium hover:text-ice transition-colors group"
            >
              Xem tất cả giải pháp
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </a>
          </div>
        </motion.div>

        {/* Solutions Grid - Prologis Card Style */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {solutions.map((solution, index) => {
            const Icon = solution.icon
            return (
              <motion.a
                key={solution.title}
                href={solution.link}
                className="group relative bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500"
                initial={{ opacity: 0, y: 30 }}
                animate={isVisible ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                {/* Card Image */}
                <div className="relative h-48 overflow-hidden">
                  <div 
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                    style={{ backgroundImage: `url(${solution.image})` }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-navy-900/80 via-navy-900/20 to-transparent" />
                  
                  {/* Icon Badge */}
                  <div className="absolute top-4 left-4 w-12 h-12 rounded-xl bg-white/95 backdrop-blur-sm flex items-center justify-center shadow-lg">
                    <Icon className="w-6 h-6 text-ice" />
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-6">
                  <h3 className="text-xl font-bold text-navy-900 mb-3 group-hover:text-ice transition-colors">
                    {solution.title}
                  </h3>
                  <p className="text-navy-600 leading-relaxed mb-4">
                    {solution.description}
                  </p>
                  <div className="flex items-center gap-2 text-ice font-medium text-sm">
                    Tìm hiểu thêm
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
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

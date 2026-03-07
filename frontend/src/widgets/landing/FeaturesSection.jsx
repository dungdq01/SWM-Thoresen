import { motion } from 'framer-motion'
import { useScrollAnimation } from '@shared/hooks/useScrollAnimation'
import { Card, CardIcon, CardTitle, CardDescription } from '@shared/ui'
import { Activity, BarChart3, Plug, Scan, Bell, Shield } from 'lucide-react'

const features = [
  {
    icon: Activity,
    title: 'Theo dõi thời gian thực',
    description: 'Cập nhật chính xác vị trí và số lượng hàng hóa trong kho ngay lập tức. Giảm thiểu 99% sai lệch tồn kho.',
  },
  {
    icon: BarChart3,
    title: 'Báo cáo thông minh',
    description: 'Hệ thống phân tích dữ liệu chuyên sâu giúp dự báo nhu cầu và đưa ra quyết định kinh doanh chính xác hơn.',
  },
  {
    icon: Plug,
    title: 'Tích hợp dễ dàng',
    description: 'Kết nối mượt mà với các nền tảng ERP, Sàn TMĐT (Shopee, Lazada) và các đơn vị vận chuyển hàng đầu.',
  },
  {
    icon: Scan,
    title: 'Quét mã vạch thông minh',
    description: 'Hỗ trợ quét QR/Barcode trên di động, tăng tốc độ nhập xuất kho lên đến 300% so với thủ công.',
  },
  {
    icon: Bell,
    title: 'Cảnh báo tự động',
    description: 'Thông báo kịp thời khi hàng sắp hết, hàng tồn lâu hoặc có bất thường trong kho. Không bỏ lỡ cơ hội.',
  },
  {
    icon: Shield,
    title: 'Bảo mật cao cấp',
    description: 'Dữ liệu được mã hóa và lưu trữ an toàn trên hạ tầng đám mây đạt chuẩn ISO 27001.',
  },
]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: 'easeOut' },
  },
}

export function FeaturesSection() {
  const { ref, isVisible } = useScrollAnimation(0.1)

  return (
    <section id="features" ref={ref} className="section-padding bg-slate-50/50">
      <div className="container-custom">
        <motion.div 
          className="text-center max-w-3xl mx-auto mb-16"
          initial={{ opacity: 0, y: 30 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-navy-900 mb-6">
            Tính năng <span className="text-primary-600">đột phá</span> cho kho hiện đại
          </h2>
          <p className="text-lg text-navy-600 leading-relaxed">
            Hệ thống quản lý kho chuyên biệt được thiết kế để giải quyết các thách thức vận hành 
            đặc thù tại thị trường Việt Nam.
          </p>
        </motion.div>

        <motion.div
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8"
          variants={containerVariants}
          initial="hidden"
          animate={isVisible ? 'visible' : 'hidden'}
        >
          {features.map((feature) => {
            const Icon = feature.icon
            return (
              <motion.div key={feature.title} variants={itemVariants}>
                <Card className="h-full">
                  <CardIcon>
                    <Icon className="w-7 h-7 text-primary-600" />
                  </CardIcon>
                  <CardTitle>{feature.title}</CardTitle>
                  <CardDescription>{feature.description}</CardDescription>
                </Card>
              </motion.div>
            )
          })}
        </motion.div>
      </div>
    </section>
  )
}

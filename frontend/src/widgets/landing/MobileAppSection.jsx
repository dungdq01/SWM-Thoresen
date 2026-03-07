import { motion } from 'framer-motion'
import { useScrollAnimation } from '@shared/hooks/useScrollAnimation'
import { Check, Smartphone, Wifi, QrCode } from 'lucide-react'

const features = [
  { icon: QrCode, text: 'Quét mã QR/Barcode siêu tốc' },
  { icon: Smartphone, text: 'Thông báo đơn hàng mới tức thì' },
  { icon: Wifi, text: 'Hoạt động offline khi mất kết nối' },
]

export function MobileAppSection() {
  const { ref, isVisible } = useScrollAnimation(0.2)

  return (
    <section id="solutions" ref={ref} className="section-padding bg-white overflow-hidden">
      <div className="container-custom">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={isVisible ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.7 }}
          >
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-navy-900 mb-6">
              Quản lý kho <span className="text-primary-600">mọi lúc, mọi nơi</span>
            </h2>
            
            <p className="text-lg text-navy-600 mb-8 leading-relaxed">
              Ứng dụng di động chuyên dụng cho nhân viên kho giúp quét mã vạch, 
              kiểm kê và xuất nhập hàng nhanh chóng chỉ với điện thoại.
            </p>

            <div className="space-y-4 mb-8">
              {features.map((feature, index) => {
                const Icon = feature.icon
                return (
                  <motion.div
                    key={feature.text}
                    className="flex items-center gap-4"
                    initial={{ opacity: 0, x: -20 }}
                    animate={isVisible ? { opacity: 1, x: 0 } : {}}
                    transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }}
                  >
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Check className="w-5 h-5 text-green-600" />
                    </div>
                    <span className="text-navy-700 font-medium">{feature.text}</span>
                  </motion.div>
                )
              })}
            </div>

            <div className="flex flex-wrap gap-4">
              <motion.a
                href="#"
                className="inline-flex items-center gap-3 bg-navy-900 text-white px-6 py-3 rounded-xl hover:bg-navy-800 transition-colors"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                </svg>
                <div className="text-left">
                  <div className="text-xs opacity-80">Tải về trên</div>
                  <div className="text-sm font-semibold">App Store</div>
                </div>
              </motion.a>

              <motion.a
                href="#"
                className="inline-flex items-center gap-3 bg-navy-900 text-white px-6 py-3 rounded-xl hover:bg-navy-800 transition-colors"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 01-.61-.92V2.734a1 1 0 01.609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.198l2.807 1.626a1 1 0 010 1.73l-2.808 1.626L15.206 12l2.492-2.491zM5.864 2.658L16.8 8.99l-2.302 2.302-8.634-8.634z"/>
                </svg>
                <div className="text-left">
                  <div className="text-xs opacity-80">Tải về trên</div>
                  <div className="text-sm font-semibold">Google Play</div>
                </div>
              </motion.a>
            </div>
          </motion.div>

          <motion.div
            className="relative"
            initial={{ opacity: 0, x: 50 }}
            animate={isVisible ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.2 }}
          >
            <div className="relative flex justify-center items-end gap-6">
              <motion.div 
                className="relative w-56 h-[450px] bg-gradient-to-b from-slate-100 to-slate-200 rounded-[3rem] p-2 shadow-soft-xl"
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              >
                <div className="w-full h-full bg-white rounded-[2.5rem] overflow-hidden flex items-center justify-center">
                  <div className="text-center p-6">
                    <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <Smartphone className="w-8 h-8 text-primary-600" />
                    </div>
                    <p className="text-navy-900 font-semibold">Apc Store</p>
                    <p className="text-navy-500 text-sm">Mã sản phẩm: 5290</p>
                  </div>
                </div>
                <div className="absolute top-8 left-1/2 -translate-x-1/2 w-20 h-6 bg-slate-900 rounded-full" />
              </motion.div>

              <motion.div 
                className="relative w-48 h-[400px] bg-gradient-to-b from-rose-100 to-rose-200 rounded-[2.5rem] p-2 shadow-soft-lg"
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
              >
                <div className="w-full h-full bg-white rounded-[2rem] overflow-hidden p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 bg-primary-100 rounded-lg" />
                    <div>
                      <div className="h-2 bg-navy-200 rounded w-16" />
                      <div className="h-2 bg-navy-100 rounded w-12 mt-1" />
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                        <div className="w-6 h-6 bg-secondary-100 rounded" />
                        <div className="flex-1">
                          <div className="h-2 bg-navy-200 rounded w-full" />
                          <div className="h-2 bg-navy-100 rounded w-2/3 mt-1" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="absolute top-6 left-1/2 -translate-x-1/2 w-16 h-5 bg-slate-900 rounded-full" />
              </motion.div>
            </div>

            <motion.div 
              className="absolute top-1/4 -right-4 bg-white rounded-2xl shadow-soft-lg p-4 border border-navy-100"
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <Check className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-navy-900">Đã nhập kho</p>
                  <p className="text-xs text-primary-600">+240 Sản phẩm</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

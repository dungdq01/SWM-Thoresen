import { motion } from 'framer-motion'
import { useScrollAnimation } from '@shared/hooks/useScrollAnimation'
import { QrCode, Smartphone, Wifi, BarChart3, Bell, AlertTriangle, Package, CheckCircle2, TrendingUp } from 'lucide-react'

const features = [
  { icon: QrCode,     text: 'Quét mã QR/Barcode tốc độ cao' },
  { icon: Smartphone, text: 'Nhận thông báo đơn hàng tức thì' },
  { icon: Wifi,       text: 'Hoạt động offline khi mất mạng' },
  { icon: BarChart3,  text: 'Báo cáo tồn kho thời gian thực' },
]

const chartBars = [40, 65, 50, 80, 55, 90, 70]

const orderList = [
  { dot: '#22c55e', id: '#ĐH-4821', status: 'Đang xử lý',  statusColor: 'bg-blue-500/20 text-blue-300' },
  { dot: '#60a5fa', id: '#ĐH-4820', status: 'Hoàn thành',  statusColor: 'bg-green-500/20 text-green-300' },
  { dot: '#f59e0b', id: '#ĐH-4819', status: 'Chờ duyệt',   statusColor: 'bg-yellow-500/20 text-yellow-300' },
]

const notifications = [
  {
    icon: CheckCircle2,
    iconColor: 'text-green-500',
    iconBg: 'bg-green-100',
    title: 'Nhập kho thành công',
    sub: '+240 sản phẩm · Kho HCM',
    position: 'top-[8%] -left-6',
    delay: 0.5,
    bobDelay: 0,
  },
  {
    icon: AlertTriangle,
    iconColor: 'text-yellow-500',
    iconBg: 'bg-yellow-100',
    title: 'Tồn kho thấp',
    sub: 'SKU-2910 · Còn 12 sp',
    position: 'top-[42%] -right-8',
    delay: 0.7,
    bobDelay: 0.4,
  },
  {
    icon: Package,
    iconColor: 'text-blue-500',
    iconBg: 'bg-blue-100',
    title: 'Đơn #4821 đang xử lý',
    sub: 'Tầng 3 · Lô B12',
    position: 'bottom-[18%] -left-4',
    delay: 0.9,
    bobDelay: 0.8,
  },
]

function PhoneDashboard() {
  return (
    <div className="w-full h-full bg-[#0a1628] flex flex-col overflow-hidden">
      {/* Status Bar */}
      <div className="flex items-center justify-between px-4 pt-3 pb-1">
        <span className="text-[10px] text-white/50 font-medium">9:41</span>
        <div className="flex items-center gap-1">
          <div className="flex gap-[2px] items-end">
            {[3,5,7,9].map((h,i) => (
              <div key={i} style={{ height: h }} className="w-[3px] bg-white/60 rounded-sm" />
            ))}
          </div>
          <svg className="w-3 h-3 text-white/60" viewBox="0 0 24 24" fill="currentColor">
            <path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3a4.237 4.237 0 00-6 0zm-4-4l2 2a7.074 7.074 0 0110 0l2-2C15.14 9.14 8.87 9.14 5 13z"/>
          </svg>
          <div className="flex items-center gap-[1px]">
            <div className="h-[10px] w-5 border border-white/50 rounded-sm p-[1px]">
              <div className="h-full w-3/4 bg-green-400 rounded-[2px]" />
            </div>
          </div>
        </div>
      </div>

      {/* App Header */}
      <div className="flex items-center justify-between px-4 py-2">
        <div>
          <p className="text-[11px] text-white/50">Xin chào,</p>
          <p className="text-[13px] text-white font-semibold leading-tight">SmartLog WMS</p>
        </div>
        <div className="relative">
          <div className="w-7 h-7 bg-white/10 rounded-lg flex items-center justify-center">
            <Bell className="w-3.5 h-3.5 text-white/80" />
          </div>
          <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full" />
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-2 px-3 py-1">
        <div className="bg-white/8 rounded-xl p-2.5" style={{ background: 'rgba(255,255,255,0.07)' }}>
          <p className="text-[9px] text-white/50 mb-1">Tồn kho</p>
          <p className="text-[15px] text-white font-bold leading-none">12,840</p>
          <div className="flex items-center gap-1 mt-1">
            <TrendingUp className="w-2.5 h-2.5 text-green-400" />
            <span className="text-[9px] text-green-400">+2.4%</span>
          </div>
        </div>
        <div className="bg-white/8 rounded-xl p-2.5" style={{ background: 'rgba(255,255,255,0.07)' }}>
          <p className="text-[9px] text-white/50 mb-1">Đơn hôm nay</p>
          <p className="text-[15px] text-white font-bold leading-none">148</p>
          <div className="flex items-center gap-1 mt-1">
            <span className="text-[9px] text-yellow-400">↑ 12 chờ xử lý</span>
          </div>
        </div>
      </div>

      {/* Mini Chart */}
      <div className="px-3 py-2">
        <div className="bg-white/5 rounded-xl p-2.5" style={{ background: 'rgba(255,255,255,0.05)' }}>
          <p className="text-[9px] text-white/40 mb-2">Xuất kho 7 ngày qua</p>
          <div className="flex items-end gap-[3px] h-10">
            {chartBars.map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-sm"
                style={{
                  height: `${h}%`,
                  background: i === 5 ? '#60a5fa' : 'rgba(96,165,250,0.3)',
                }}
              />
            ))}
          </div>
          <div className="flex justify-between mt-1.5">
            {['T2','T3','T4','T5','T6','T7','CN'].map((d) => (
              <span key={d} className="text-[8px] text-white/30">{d}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Order List */}
      <div className="px-3 flex-1">
        <p className="text-[9px] text-white/40 mb-2 font-medium uppercase tracking-wide">Đơn hàng mới nhất</p>
        <div className="space-y-1.5">
          {orderList.map((order) => (
            <div key={order.id} className="flex items-center gap-2 py-1.5 px-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.05)' }}>
              <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: order.dot }} />
              <span className="text-[10px] text-white/80 flex-1 font-medium">{order.id}</span>
              <span className={`text-[8px] px-1.5 py-0.5 rounded-md font-medium ${order.statusColor}`}>
                {order.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Nav */}
      <div className="flex items-center justify-around px-4 py-3 mt-auto border-t border-white/5">
        {['⊞','↑↓','▦','👤'].map((icon, i) => (
          <div
            key={i}
            className={`flex flex-col items-center gap-0.5 ${i === 0 ? 'opacity-100' : 'opacity-30'}`}
          >
            <span className="text-[12px] text-white">{icon}</span>
            {i === 0 && <div className="w-1 h-1 bg-ice rounded-full" />}
          </div>
        ))}
      </div>
    </div>
  )
}

function PhoneScanScreen() {
  return (
    <div className="w-full h-full bg-[#050e1a] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-3 pt-4 pb-2">
        <p className="text-[9px] text-white/40 uppercase tracking-wider">Quét mã hàng hoá</p>
        <p className="text-[12px] text-white font-semibold">Nhập kho nhanh</p>
      </div>

      {/* Scanner View */}
      <div className="flex-1 relative mx-3 rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
        {/* Corner brackets */}
        <div className="absolute inset-4 z-10">
          <div className="absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2 border-green-400 rounded-tl-sm" />
          <div className="absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2 border-green-400 rounded-tr-sm" />
          <div className="absolute bottom-0 left-0 w-5 h-5 border-b-2 border-l-2 border-green-400 rounded-bl-sm" />
          <div className="absolute bottom-0 right-0 w-5 h-5 border-b-2 border-r-2 border-green-400 rounded-br-sm" />
        </div>

        {/* Barcode lines */}
        <div className="absolute inset-8 flex gap-[2px] items-center">
          {[4,7,2,6,4,3,8,5,2,7,4,6,3,5,8,2,4,7,3,6].map((h, i) => (
            <div
              key={i}
              className="flex-1 bg-white/30 rounded-[1px]"
              style={{ height: `${h * 8}%` }}
            />
          ))}
        </div>

        {/* Scan line */}
        <motion.div
          className="absolute left-4 right-4 h-[2px] bg-green-400 z-20"
          style={{ boxShadow: '0 0 8px 2px rgba(34,197,94,0.6)' }}
          animate={{ top: ['20%', '80%', '20%'] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      {/* SKU Info */}
      <div className="px-3 py-3">
        <div className="rounded-xl p-2.5" style={{ background: 'rgba(255,255,255,0.07)' }}>
          <div className="flex items-center gap-2">
            <motion.div
              className="w-2 h-2 bg-green-400 rounded-full"
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
            <p className="text-[10px] text-green-400 font-medium">Đang quét...</p>
          </div>
          <p className="text-[11px] text-white font-semibold mt-1">SKU-2910</p>
          <p className="text-[9px] text-white/40">Kệ B3 · Lô 12 · SL: 240</p>
        </div>
      </div>
    </div>
  )
}

export function MobileAppSection() {
  const { ref, isVisible } = useScrollAnimation(0.15)

  return (
    <section id="mobile-app" ref={ref} className="section-padding bg-navy-900 overflow-hidden relative">
      {/* Ambient glow behind phones */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 60% 55% at 72% 52%, rgba(96,165,250,0.18) 0%, transparent 68%)' }}
      />

      <div className="container-custom relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">

          {/* ── Left column ── */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={isVisible ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.7 }}
          >
            <p className="text-ice font-semibold tracking-widest uppercase text-sm mb-4">
              Ứng dụng di động
            </p>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6 leading-[1.1]">
              Quản lý kho <span className="text-ice">mọi lúc,</span>
              <br />mọi nơi
            </h2>

            <p className="text-lg text-moon-300 mb-10 leading-relaxed">
              Ứng dụng di động chuyên dụng cho nhân viên kho — quét mã vạch, kiểm kê
              và xuất nhập hàng nhanh chóng chỉ với điện thoại thông minh.
            </p>

            <div className="space-y-4 mb-10">
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
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: 'rgba(96,165,250,0.12)' }}>
                      <Icon className="w-5 h-5 text-ice" />
                    </div>
                    <span className="text-moon-200 font-medium">{feature.text}</span>
                  </motion.div>
                )
              })}
            </div>

            {/* Store Buttons */}
            <div className="flex flex-wrap gap-4">
              <motion.a
                href="#"
                className="inline-flex items-center gap-3 px-5 py-3 rounded-xl transition-all duration-200"
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  backdropFilter: 'blur(8px)',
                }}
                whileHover={{ scale: 1.03, background: 'rgba(255,255,255,0.14)' }}
                whileTap={{ scale: 0.97 }}
              >
                <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                </svg>
                <div className="text-left">
                  <div className="text-[10px] text-white/60">Tải về trên</div>
                  <div className="text-sm font-semibold text-white">App Store</div>
                </div>
              </motion.a>

              <motion.a
                href="#"
                className="inline-flex items-center gap-3 px-5 py-3 rounded-xl transition-all duration-200"
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  backdropFilter: 'blur(8px)',
                }}
                whileHover={{ scale: 1.03, background: 'rgba(255,255,255,0.14)' }}
                whileTap={{ scale: 0.97 }}
              >
                <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 01-.61-.92V2.734a1 1 0 01.609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.198l2.807 1.626a1 1 0 010 1.73l-2.808 1.626L15.206 12l2.492-2.491zM5.864 2.658L16.8 8.99l-2.302 2.302-8.634-8.634z"/>
                </svg>
                <div className="text-left">
                  <div className="text-[10px] text-white/60">Tải về trên</div>
                  <div className="text-sm font-semibold text-white">Google Play</div>
                </div>
              </motion.a>
            </div>
          </motion.div>

          {/* ── Right column — Phone Group ── */}
          <motion.div
            className="relative flex justify-center items-center min-h-[520px]"
            initial={{ opacity: 0, x: 50 }}
            animate={isVisible ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            {/* Secondary phone — barcode scanner — behind primary */}
            <motion.div
              className="absolute left-[5%] bottom-4 z-0"
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
            >
              <div
                className="w-44 h-[370px] rounded-[2.6rem] p-[3px] shadow-soft-xl"
                style={{
                  background: 'linear-gradient(160deg, #334155, #1e293b)',
                  transform: 'perspective(900px) rotateY(-8deg) rotateX(2deg)',
                  transformStyle: 'preserve-3d',
                }}
              >
                <div className="w-full h-full rounded-[2.3rem] overflow-hidden relative">
                  {/* Notch */}
                  <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-16 h-[18px] bg-[#050e1a] rounded-full z-10" />
                  <PhoneScanScreen />
                </div>
              </div>
            </motion.div>

            {/* Primary phone — dashboard — front */}
            <motion.div
              className="relative z-10 ml-16"
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
            >
              <div
                className="w-60 h-[520px] rounded-[3.2rem] p-[3px] shadow-2xl"
                style={{
                  background: 'linear-gradient(160deg, #64748b, #1e293b)',
                  transform: 'perspective(900px) rotateY(-18deg) rotateX(4deg)',
                  transformStyle: 'preserve-3d',
                  boxShadow: '0 40px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)',
                }}
              >
                <div className="w-full h-full rounded-[3rem] overflow-hidden relative">
                  {/* Notch */}
                  <div className="absolute top-3 left-1/2 -translate-x-1/2 w-24 h-6 bg-[#0a1628] rounded-full z-10" />
                  <PhoneDashboard />
                </div>
              </div>

              {/* Reflection/glow under phone */}
              <div
                className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-48 h-8 blur-xl opacity-40 rounded-full"
                style={{ background: 'rgba(96,165,250,0.5)' }}
              />
            </motion.div>

            {/* Floating notification cards */}
            {notifications.map((notif, index) => {
              const Icon = notif.icon
              return (
                <motion.div
                  key={index}
                  className={`absolute ${notif.position} z-20`}
                  initial={{ opacity: 0, x: 40, scale: 0.9 }}
                  animate={isVisible ? {
                    opacity: 1, x: 0, scale: 1,
                    y: [0, -6, 0],
                  } : {}}
                  transition={{
                    opacity: { duration: 0.5, delay: notif.delay },
                    x: { duration: 0.5, delay: notif.delay },
                    scale: { duration: 0.5, delay: notif.delay },
                    y: {
                      duration: 3,
                      repeat: Infinity,
                      ease: 'easeInOut',
                      delay: notif.bobDelay,
                      repeatDelay: 0,
                    },
                  }}
                >
                  <div
                    className="flex items-center gap-3 px-4 py-3 rounded-2xl max-w-[200px]"
                    style={{
                      background: 'rgba(255,255,255,0.95)',
                      backdropFilter: 'blur(12px)',
                      border: '1px solid rgba(241,245,249,0.8)',
                      boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
                    }}
                  >
                    <div className={`w-9 h-9 ${notif.iconBg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                      <Icon className={`w-4 h-4 ${notif.iconColor}`} />
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold leading-tight" style={{ color: '#0c1829' }}>{notif.title}</p>
                      <p className="text-[10px] mt-0.5 leading-tight" style={{ color: '#5374a7' }}>{notif.sub}</p>
                    </div>
                  </div>
                </motion.div>
              )
            })}

            {/* LIVE indicator */}
            <motion.div
              className="absolute top-[22%] right-2 z-20"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={isVisible ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 0.4, delay: 1.1 }}
            >
              <div
                className="flex items-center gap-2 px-3 py-2 rounded-xl"
                style={{
                  background: 'rgba(255,255,255,0.95)',
                  backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(241,245,249,0.8)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
                }}
              >
                <motion.div
                  className="w-2 h-2 bg-green-500 rounded-full"
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                />
                <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#16a34a' }}>Live</span>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

import { useState } from 'react'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Eye, EyeOff, ArrowRight, Package, BarChart3, Shield, Truck } from 'lucide-react'
import { useAuth } from '@domains/auth'

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()
  const [form, setForm] = useState({ username: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
    if (error) setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.username.trim()) return setError('Vui lòng nhập tên đăng nhập')
    if (!form.password) return setError('Vui lòng nhập mật khẩu')

    setIsLoading(true)
    setError('')
    try {
      await login({ username: form.username, password: form.password })
      const from = location.state?.from?.pathname || '/app'
      navigate(from, { replace: true })
    } catch (err) {
      setError(err.message || 'Đăng nhập không thành công. Vui lòng kiểm tra lại thông tin.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-navy-900" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      {/* ── Background: Warehouse image + gradient (same as HeroSection) ── */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-navy-900 via-navy-900/95 to-navy-900/80 z-10" />
        <div
          className="absolute inset-0 bg-cover bg-center opacity-30"
          style={{
            backgroundImage: 'url("https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80")',
          }}
        />
      </div>


      {/* ── Ambient glow orbs ── */}
      <div className="hidden sm:block absolute top-1/4 -left-32 w-[300px] h-[300px] md:w-[500px] md:h-[500px] rounded-full opacity-20 z-10"
        style={{ background: 'radial-gradient(circle, rgba(96,165,250,0.35) 0%, transparent 70%)' }}
      />
      <div className="hidden sm:block absolute -bottom-20 right-0 w-[350px] h-[350px] md:w-[600px] md:h-[600px] rounded-full opacity-15 z-10"
        style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.3) 0%, transparent 70%)' }}
      />


      {/* ── Header (fixed top) ── */}
      <header className="fixed top-0 left-0 right-0 z-50" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div className="container-custom flex items-center justify-between py-5">
          <Link to="/" className="flex items-center gap-3 group">
            <img
              src="/assets/logo.png"
              alt="SmartLog"
              className="h-9 w-auto"
            />
            <div className="flex flex-col">
              <span className="text-lg font-bold text-white tracking-tight">SmartLog</span>
              <span className="text-[10px] font-medium tracking-widest uppercase text-ice-light">
                Warehouse Solutions
              </span>
            </div>
          </Link>
          <Link
            to="/"
            className="text-sm font-medium text-white/70 hover:text-white transition-colors hidden sm:block"
          >
            ← Về trang chủ
          </Link>
        </div>
      </header>

      {/* ── Main content ── */}
      <div
        className="relative z-20 w-full max-w-[460px] mx-3 sm:mx-6"
        style={{ marginTop: 'calc(env(safe-area-inset-top, 0px) + 80px)' }}
      >
        {/* Glassmorphism card */}
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="relative rounded-2xl overflow-hidden"
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            boxShadow: '0 30px 80px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05) inset',
          }}
        >
          {/* Top accent line */}
          <div className="h-[2px] bg-gradient-to-r from-transparent via-ice to-transparent" />

          <div className="px-6 pt-6 pb-7 sm:px-10 sm:pt-10 sm:pb-12">
            {/* Welcome text */}
            <motion.div
              className="mb-6 sm:mb-8 text-center"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <p className="text-ice font-semibold tracking-widest uppercase text-[11px] mb-2 sm:mb-3">
                Warehouse Management System
              </p>
              <h1 className="text-xl sm:text-[28px] font-bold text-white tracking-tight leading-tight">
                Đăng nhập hệ thống
              </h1>
              <p className="mt-2 text-sm text-white/50 leading-relaxed hidden sm:block">
                Truy cập hệ thống quản lý kho thông minh của bạn
              </p>
            </motion.div>

            {/* Form */}
            <motion.form
              onSubmit={handleSubmit}
              className="space-y-5"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.35 }}
            >
              {/* Username */}
              <div className="space-y-2">
                <label htmlFor="username" className="text-[13px] font-semibold text-white/70">
                  Tên đăng nhập
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="off"
                  value={form.username}
                  onChange={handleChange}
                  placeholder="Ví dụ: admin"
                  disabled={isLoading}
                  className="h-12 w-full rounded-xl px-4 text-sm text-white placeholder:text-white/30 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ice/30"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.12)',
                  }}
                  onFocus={(e) => { e.target.style.borderColor = 'rgba(96,165,250,0.5)'; e.target.style.background = 'rgba(255,255,255,0.09)' }}
                  onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.12)'; e.target.style.background = 'rgba(255,255,255,0.06)' }}
                />
              </div>

              {/* Password */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="text-[13px] font-semibold text-white/70">
                    Mật khẩu
                  </label>
                  <button
                    type="button"
                    className="text-xs font-medium text-ice/70 hover:text-ice transition-colors"
                  >
                    Quên mật khẩu?
                  </button>
                </div>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="off"
                    value={form.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    disabled={isLoading}
                    className="h-12 w-full rounded-xl px-4 pr-12 text-sm text-white placeholder:text-white/30 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ice/30"
                    style={{
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.12)',
                    }}
                    onFocus={(e) => { e.target.style.borderColor = 'rgba(96,165,250,0.5)'; e.target.style.background = 'rgba(255,255,255,0.09)' }}
                    onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.12)'; e.target.style.background = 'rgba(255,255,255,0.06)' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-white/30 hover:text-white/60 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm text-red-300"
                  style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.2)' }}
                >
                  <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 16 16" fill="currentColor">
                    <path fillRule="evenodd" d="M8 15A7 7 0 108 1a7 7 0 000 14zM8 4a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 018 4zm0 8a1 1 0 100-2 1 1 0 000 2z" />
                  </svg>
                  {error}
                </motion.div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading}
                className="relative h-12 w-full rounded-xl bg-ice text-sm font-semibold text-navy-900 transition-all duration-300 hover:bg-ice-light hover:shadow-lg hover:shadow-ice/20 focus:outline-none focus:ring-2 focus:ring-ice/40 active:scale-[0.98] disabled:opacity-60 disabled:pointer-events-none overflow-hidden group"
              >
                <span className={`inline-flex items-center gap-2 transition-all duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}>
                  Đăng nhập
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                </span>
                {isLoading && (
                  <span className="absolute inset-0 flex items-center justify-center">
                    <svg className="animate-spin h-5 w-5 text-navy-900" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  </span>
                )}
                {/* Sweep effect */}
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              </button>

              {/* Sample Accounts */}
              <div className="mt-5 pt-5 border-t border-white/10">
                <p className="text-xs font-medium text-white/60 mb-3 text-center">Tài khoản mẫu để test</p>
                {/* Mobile: horizontal scroll row */}
                <div className="flex gap-2 overflow-x-auto pb-1 sm:grid sm:grid-cols-2 sm:overflow-visible" style={{ scrollbarWidth: 'none' }}>
                  {[
                    { username: 'admin', password: 'Admin@123', role: 'Quản trị viên', color: 'text-red-300' },
                    { username: 'wh_manager', password: 'WhMgr@123456', role: 'Quản lý kho', color: 'text-blue-300' },
                    { username: 'wh_keeper', password: 'WhKpr@123456', role: 'Thủ kho', color: 'text-green-300' },
                    { username: 'wb_operator', password: 'WbOp@123456', role: 'Vận hành cân', color: 'text-yellow-300' },
                    { username: 'ops_super', password: 'OpSu@123456', role: 'Giám sát vận hành', color: 'text-purple-300' },
                    { username: 'billing_officer', password: 'Billing@123456', role: 'Nhân viên billing', color: 'text-pink-300' },
                  ].map((account) => (
                    <button
                      key={account.username}
                      type="button"
                      onClick={() => {
                        setForm({ username: account.username, password: account.password });
                      }}
                      className="flex-shrink-0 p-2.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all duration-200 text-left group"
                      style={{ minWidth: '120px' }}
                    >
                      <div className={`font-medium text-xs ${account.color} group-hover:text-white transition-colors truncate`}>
                        {account.username}
                      </div>
                      <div className="text-white/40 text-[10px] mt-0.5 group-hover:text-white/60 transition-colors truncate">
                        {account.role}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </motion.form>

            {/* Divider + Feature highlights — desktop only */}
            <div className="hidden sm:block">
              <div className="relative my-7">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }} />
                </div>
                <div className="relative flex justify-center text-[11px]">
                  <span className="px-4 text-white/30 font-medium" style={{ background: 'transparent', backdropFilter: 'blur(4px)' }}>
                    Hệ thống quản lý kho thông minh
                  </span>
                </div>
              </div>

              <motion.div
                className="grid grid-cols-2 gap-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.6 }}
              >
                {[
                  { icon: Package, label: 'Quản lý tồn kho' },
                  { icon: Truck, label: 'Xuất nhập kho' },
                  { icon: BarChart3, label: 'Báo cáo realtime' },
                  { icon: Shield, label: 'Bảo mật RBAC' },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center gap-2.5 rounded-lg px-3 py-2.5"
                    style={{ background: 'rgba(255,255,255,0.04)' }}
                  >
                    <item.icon className="w-3.5 h-3.5 text-ice/60 flex-shrink-0" />
                    <span className="text-[11px] font-medium text-white/40">{item.label}</span>
                  </div>
                ))}
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* Footer text */}
        <motion.p
          className="mt-6 text-center text-[11px] text-white/25"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          © {new Date().getFullYear()} SmartLog / Thoresen. Bảo lưu mọi quyền.
        </motion.p>
      </div>
    </div>
  )
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Floating 3D Warehouse Elements — positioned around the form
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function Floating3DElements() {
  return (
    <div className="absolute inset-0 z-[15] pointer-events-none overflow-hidden">
      {/* ── Top-left: Stacked containers ── */}
      <motion.div
        className="absolute hidden lg:block"
        style={{ top: '12%', left: '8%' }}
        animate={{ y: [0, -14, 0], rotateY: [0, 4, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
      >
        <div style={{ perspective: '600px' }}>
          <div style={{ transform: 'rotateX(12deg) rotateY(-20deg)', transformStyle: 'preserve-3d' }}>
            <ContainerBox w={110} h={70} color="rgba(96,165,250,0.2)" borderColor="rgba(96,165,250,0.35)" />
            <div className="mt-[-2px]">
              <ContainerBox w={110} h={70} color="rgba(59,130,246,0.15)" borderColor="rgba(59,130,246,0.25)" />
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Top-right: Shipping box cluster ── */}
      <motion.div
        className="absolute hidden lg:block"
        style={{ top: '8%', right: '10%' }}
        animate={{ y: [0, -18, 0], rotate: [0, 1.5, 0] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
      >
        <div style={{ perspective: '600px' }}>
          <div style={{ transform: 'rotateX(15deg) rotateY(15deg)', transformStyle: 'preserve-3d' }}>
            <div className="flex gap-2 items-end">
              <CrateBox size={52} color="#f59e0b" />
              <CrateBox size={40} color="#10b981" />
            </div>
            <div className="mt-[-4px] ml-3">
              <CrateBox size={46} color="#3b82f6" />
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Bottom-left: Pallet with goods ── */}
      <motion.div
        className="absolute hidden md:block"
        style={{ bottom: '10%', left: '6%' }}
        animate={{ y: [0, -10, 0], rotateZ: [0, -1, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
      >
        <div style={{ perspective: '600px' }}>
          <div style={{ transform: 'rotateX(10deg) rotateY(-25deg)', transformStyle: 'preserve-3d' }}>
            <PalletUnit />
          </div>
        </div>
      </motion.div>

      {/* ── Bottom-right: Barcode scanner / package ── */}
      <motion.div
        className="absolute hidden md:block"
        style={{ bottom: '14%', right: '7%' }}
        animate={{ y: [0, -12, 0], rotateY: [0, -5, 0] }}
        transition={{ duration: 6.5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
      >
        <div style={{ perspective: '600px' }}>
          <div style={{ transform: 'rotateX(8deg) rotateY(20deg)', transformStyle: 'preserve-3d' }}>
            <ShippingBox />
          </div>
        </div>
      </motion.div>

      {/* ── Left-center: Shelf rack ── */}
      <motion.div
        className="absolute hidden xl:block"
        style={{ top: '50%', left: '4%', transform: 'translateY(-50%)' }}
        animate={{ y: ['-50%', 'calc(-50% - 12px)', '-50%'] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
      >
        <div style={{ perspective: '600px' }}>
          <div style={{ transform: 'rotateX(5deg) rotateY(-15deg)', transformStyle: 'preserve-3d' }}>
            <ShelfRack />
          </div>
        </div>
      </motion.div>

      {/* ── Right-center: Warehouse rack ── */}
      <motion.div
        className="absolute hidden xl:block"
        style={{ top: '45%', right: '4%', transform: 'translateY(-50%)' }}
        animate={{ y: ['-50%', 'calc(-50% + 10px)', '-50%'] }}
        transition={{ duration: 8.5, repeat: Infinity, ease: 'easeInOut', delay: 1.5 }}
      >
        <div style={{ perspective: '600px' }}>
          <div style={{ transform: 'rotateX(5deg) rotateY(12deg)', transformStyle: 'preserve-3d' }}>
            <ShelfRack flipped />
          </div>
        </div>
      </motion.div>

      {/* ── Floating particles ── */}
      {[
        { x: '15%', y: '25%', delay: 0, size: 4 },
        { x: '85%', y: '20%', delay: 1.5, size: 3 },
        { x: '10%', y: '70%', delay: 3, size: 5 },
        { x: '88%', y: '65%', delay: 2, size: 3 },
        { x: '25%', y: '85%', delay: 4, size: 4 },
        { x: '75%', y: '80%', delay: 0.8, size: 3 },
        { x: '50%', y: '10%', delay: 2.5, size: 4 },
      ].map((p, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            left: p.x, top: p.y,
            width: p.size, height: p.size,
            background: 'rgba(96,165,250,0.4)',
            boxShadow: '0 0 12px rgba(96,165,250,0.3)',
          }}
          animate={{ opacity: [0.3, 0.8, 0.3], scale: [1, 1.3, 1] }}
          transition={{ duration: 3, repeat: Infinity, delay: p.delay, ease: 'easeInOut' }}
        />
      ))}
    </div>
  )
}

/* ── 3D Building blocks ── */

function ContainerBox({ w = 100, h = 60, color, borderColor }) {
  return (
    <div
      className="rounded-lg relative overflow-hidden"
      style={{
        width: w, height: h,
        background: color,
        border: `1px solid ${borderColor}`,
        boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
      }}
    >
      {/* Container ridges */}
      <div className="absolute inset-x-1.5 inset-y-1.5 flex flex-col justify-between opacity-60">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="w-full h-px" style={{ background: borderColor }} />
        ))}
      </div>
      {/* Lock icon */}
      <div className="absolute top-1.5 right-2 w-2.5 h-3 rounded-sm" style={{ background: borderColor }} />
    </div>
  )
}

function CrateBox({ size = 48, color = '#3b82f6' }) {
  return (
    <div
      className="rounded-lg relative"
      style={{
        width: size, height: size,
        background: `linear-gradient(135deg, ${color}33, ${color}1a)`,
        border: `1px solid ${color}44`,
        boxShadow: `0 6px 20px ${color}15`,
      }}
    >
      {/* Tape cross */}
      <div className="absolute inset-0 flex items-center justify-center opacity-40">
        <div className="absolute w-full h-px" style={{ background: color, top: '50%' }} />
        <div className="absolute h-full w-px" style={{ background: color, left: '50%' }} />
      </div>
    </div>
  )
}

function PalletUnit() {
  return (
    <div className="relative" style={{ width: 120 }}>
      {/* Pallet base */}
      <div
        className="rounded-md relative"
        style={{
          width: 120, height: 12,
          background: 'rgba(180,140,80,0.35)',
          border: '1px solid rgba(180,140,80,0.25)',
        }}
      >
        <div className="absolute inset-0 flex items-center justify-between px-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="w-1 h-full rounded-sm" style={{ background: 'rgba(180,140,80,0.5)' }} />
          ))}
        </div>
      </div>
      {/* Boxes on pallet */}
      <div className="flex gap-1 mt-[-1px]">
        <div className="w-[38px] h-[32px] rounded-md" style={{ background: 'rgba(96,165,250,0.3)', border: '1px solid rgba(96,165,250,0.25)' }} />
        <div className="w-[38px] h-[32px] rounded-md" style={{ background: 'rgba(245,158,11,0.3)', border: '1px solid rgba(245,158,11,0.25)' }} />
        <div className="w-[38px] h-[32px] rounded-md" style={{ background: 'rgba(16,185,129,0.3)', border: '1px solid rgba(16,185,129,0.25)' }} />
      </div>
      {/* Top row */}
      <div className="flex gap-1 mt-[-1px] pl-2">
        <div className="w-[34px] h-[28px] rounded-md" style={{ background: 'rgba(168,85,247,0.25)', border: '1px solid rgba(168,85,247,0.2)' }} />
        <div className="w-[34px] h-[28px] rounded-md" style={{ background: 'rgba(59,130,246,0.25)', border: '1px solid rgba(59,130,246,0.2)' }} />
      </div>
    </div>
  )
}

function ShippingBox() {
  return (
    <div className="relative">
      {/* Main box */}
      <div
        className="rounded-xl relative overflow-hidden"
        style={{
          width: 90, height: 80,
          background: 'rgba(96,165,250,0.12)',
          border: '1px solid rgba(96,165,250,0.25)',
          boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
        }}
      >
        {/* Shipping label */}
        <div className="absolute top-3 left-3 right-3">
          <div className="rounded-md p-1.5" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="w-full h-1 rounded-full mb-1" style={{ background: 'rgba(255,255,255,0.15)' }} />
            <div className="w-3/4 h-1 rounded-full mb-1.5" style={{ background: 'rgba(255,255,255,0.1)' }} />
            {/* Barcode lines */}
            <div className="flex gap-px">
              {[...Array(12)].map((_, i) => (
                <div key={i} className="h-2.5 rounded-sm" style={{
                  width: i % 3 === 0 ? 2 : 1.5,
                  background: `rgba(255,255,255,${i % 2 === 0 ? 0.2 : 0.1})`,
                }} />
              ))}
            </div>
          </div>
        </div>
        {/* Tape */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-3 rounded-t-sm" style={{ background: 'rgba(245,158,11,0.3)' }} />
      </div>
      {/* Shadow box behind */}
      <div
        className="absolute -z-10 rounded-xl"
        style={{
          width: 90, height: 80,
          top: 6, left: 6,
          background: 'rgba(96,165,250,0.06)',
          border: '1px solid rgba(96,165,250,0.1)',
        }}
      />
    </div>
  )
}

function ShelfRack({ flipped = false }) {
  const rows = 3
  return (
    <div
      className="rounded-xl relative overflow-hidden"
      style={{
        width: 100, height: 140,
        background: 'rgba(96,165,250,0.06)',
        border: '1px solid rgba(96,165,250,0.15)',
        boxShadow: '0 12px 30px rgba(0,0,0,0.1)',
        transform: flipped ? 'scaleX(-1)' : undefined,
      }}
    >
      {/* Vertical posts */}
      <div className="absolute left-2 top-0 bottom-0 w-px" style={{ background: 'rgba(96,165,250,0.2)' }} />
      <div className="absolute right-2 top-0 bottom-0 w-px" style={{ background: 'rgba(96,165,250,0.2)' }} />

      {/* Shelf levels with goods */}
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="absolute left-0 right-0" style={{ top: 10 + i * 42 }}>
          <div className="mx-2 h-px" style={{ background: 'rgba(96,165,250,0.25)' }} />
          <div className="flex gap-1 mt-1.5 mx-3">
            <div className="h-4 rounded-sm flex-1" style={{
              background: i === 0
                ? 'rgba(245,158,11,0.35)'
                : i === 1
                  ? 'rgba(16,185,129,0.35)'
                  : 'rgba(96,165,250,0.35)',
            }} />
            <div className="h-4 rounded-sm flex-1" style={{
              background: i === 0
                ? 'rgba(59,130,246,0.3)'
                : i === 1
                  ? 'rgba(245,158,11,0.3)'
                  : 'rgba(168,85,247,0.3)',
            }} />
            <div className="h-4 rounded-sm w-4" style={{
              background: i === 0
                ? 'rgba(16,185,129,0.3)'
                : i === 1
                  ? 'rgba(239,68,68,0.25)'
                  : 'rgba(245,158,11,0.3)',
            }} />
          </div>
        </div>
      ))}
    </div>
  )
}

import { Mail, Phone, MapPin, Facebook, Youtube, Linkedin, ArrowRight } from 'lucide-react'

const footerLinks = {
  solutions: {
    title: 'Giải pháp',
    links: [
      { label: 'Quản lý Kho', href: '#warehouse' },
      { label: 'Vận hành Logistics', href: '#logistics' },
      { label: 'Kiểm soát Tồn kho', href: '#inventory' },
      { label: 'Phân tích & Báo cáo', href: '#analytics' },
    ],
  },
  company: {
    title: 'Về chúng tôi',
    links: [
      { label: 'Giới thiệu', href: '#about' },
      { label: 'Đội ngũ', href: '#team' },
      { label: 'Tuyển dụng', href: '#careers' },
      { label: 'Tin tức', href: '#news' },
    ],
  },
  resources: {
    title: 'Tài nguyên',
    links: [
      { label: 'Insights', href: '#insights' },
      { label: 'Nghiên cứu', href: '#research' },
      { label: 'Case Studies', href: '#case-studies' },
      { label: 'Webinars', href: '#webinars' },
    ],
  },
  support: {
    title: 'Hỗ trợ',
    links: [
      { label: 'Trung tâm trợ giúp', href: '#help' },
      { label: 'Tài liệu API', href: '#api-docs' },
      { label: 'Liên hệ', href: '#contact' },
      { label: 'FAQ', href: '#faq' },
    ],
  },
}

const socialLinks = [
  { icon: Facebook, href: '#', label: 'Facebook' },
  { icon: Youtube, href: '#', label: 'Youtube' },
  { icon: Linkedin, href: '#', label: 'LinkedIn' },
]

export function Footer() {
  return (
    <footer id="contact" className="bg-navy-900 text-white">
      {/* Newsletter Section */}
      <div className="border-b border-navy-700">
        <div className="container-custom py-12">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
            <div>
              <h3 className="text-xl font-bold text-white mb-2">
                Nhận thông tin mới nhất
              </h3>
              <p className="text-moon-300">
                Đăng ký nhận bản tin về xu hướng logistics và cập nhật sản phẩm.
              </p>
            </div>
            <div className="flex gap-3">
              <input 
                type="email" 
                placeholder="Email của bạn"
                className="px-4 py-3 bg-navy-800 border border-navy-600 rounded-xl text-white placeholder:text-navy-400 focus:outline-none focus:border-ice w-64"
              />
              <button className="px-6 py-3 bg-ice text-navy-900 font-semibold rounded-xl hover:bg-ice-light transition-colors flex items-center gap-2">
                Đăng ký
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer */}
      <div className="container-custom">
        <div className="py-16 lg:py-20">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 lg:gap-12">
            {/* Brand Column */}
            <div className="col-span-2">
              <a href="#" className="flex items-center gap-3 mb-6">
                <img 
                  src="/assets/logo.png" 
                  alt="SmartLog" 
                  className="h-10 w-auto"
                />
                <div className="flex flex-col">
                  <span className="text-xl font-bold text-white">SmartLog</span>
                  <span className="text-[10px] font-medium tracking-widest uppercase text-ice">
                    Warehouse Solutions
                  </span>
                </div>
              </a>
              
              <p className="text-moon-300 text-sm mb-8 leading-relaxed max-w-xs">
                Chúng tôi đưa logistics đi xa hơn, vận hành chuỗi cung ứng mạnh mẽ, 
                thông minh và linh hoạt hơn bao giờ hết.
              </p>

              <div className="space-y-3 text-sm text-moon-300">
                <a href="mailto:contact@smartlog.vn" className="flex items-center gap-3 hover:text-ice transition-colors">
                  <Mail className="w-4 h-4 text-ice" />
                  contact@smartlog.vn
                </a>
                <a href="tel:1900123456" className="flex items-center gap-3 hover:text-ice transition-colors">
                  <Phone className="w-4 h-4 text-ice" />
                  1900 123 456
                </a>
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 mt-0.5 text-ice flex-shrink-0" />
                  <span>Tầng 15, Landmark 81, TP. Hồ Chí Minh</span>
                </div>
              </div>
            </div>

            {/* Link Columns */}
            {Object.entries(footerLinks).map(([key, section]) => (
              <div key={key}>
                <h3 className="font-semibold text-white mb-4">{section.title}</h3>
                <ul className="space-y-3">
                  {section.links.map((link) => (
                    <li key={link.label}>
                      <a 
                        href={link.href}
                        className="text-sm text-moon-300 hover:text-ice transition-colors"
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="py-6 border-t border-navy-700 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex flex-wrap items-center gap-4 text-sm text-moon-400">
            <span>© 2024 SmartLog. All rights reserved.</span>
            <span className="hidden md:inline">·</span>
            <a href="#privacy" className="hover:text-ice transition-colors">Chính sách bảo mật</a>
            <span className="hidden md:inline">·</span>
            <a href="#terms" className="hover:text-ice transition-colors">Điều khoản sử dụng</a>
          </div>
          
          <div className="flex items-center gap-3">
            {socialLinks.map((social) => {
              const Icon = social.icon
              return (
                <a
                  key={social.label}
                  href={social.href}
                  className="w-10 h-10 bg-navy-800 rounded-xl flex items-center justify-center text-moon-400 hover:bg-ice hover:text-navy-900 transition-all duration-300"
                  aria-label={social.label}
                >
                  <Icon className="w-5 h-5" />
                </a>
              )
            })}
          </div>
        </div>
      </div>
    </footer>
  )
}

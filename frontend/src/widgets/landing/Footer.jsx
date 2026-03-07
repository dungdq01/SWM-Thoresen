import { Box, Mail, Phone, MapPin, Facebook, Youtube, Linkedin } from 'lucide-react'

const footerLinks = {
  product: {
    title: 'Sản phẩm',
    links: [
      { label: 'Tính năng', href: '#features' },
      { label: 'Bảng giá', href: '#pricing' },
      { label: 'Tích hợp', href: '#integrations' },
      { label: 'Cập nhật', href: '#updates' },
    ],
  },
  company: {
    title: 'Công ty',
    links: [
      { label: 'Về chúng tôi', href: '#about' },
      { label: 'Blog', href: '#blog' },
      { label: 'Tuyển dụng', href: '#careers' },
      { label: 'Liên hệ', href: '#contact' },
    ],
  },
  support: {
    title: 'Hỗ trợ',
    links: [
      { label: 'Trung tâm trợ giúp', href: '#help' },
      { label: 'Tài liệu API', href: '#api-docs' },
      { label: 'Hướng dẫn sử dụng', href: '#guides' },
      { label: 'Cộng đồng', href: '#community' },
    ],
  },
  legal: {
    title: 'Pháp lý',
    links: [
      { label: 'Điều khoản sử dụng', href: '#terms' },
      { label: 'Chính sách bảo mật', href: '#privacy' },
      { label: 'Cookie', href: '#cookies' },
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
      <div className="container-custom">
        <div className="py-16 lg:py-20">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 lg:gap-12">
            <div className="col-span-2">
              <a href="#" className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center">
                  <Box className="w-6 h-6 text-white" />
                </div>
                <span className="text-xl font-bold">WMS Pro</span>
              </a>
              
              <p className="text-navy-300 text-sm mb-6 leading-relaxed max-w-xs">
                Giải pháp quản lý kho thông minh hàng đầu cho doanh nghiệp Việt Nam. 
                Đồng hành cùng bạn trong hành trình chuyển đổi số.
              </p>

              <div className="space-y-3 text-sm text-navy-300">
                <a href="mailto:contact@wmspro.vn" className="flex items-center gap-3 hover:text-white transition-colors">
                  <Mail className="w-4 h-4" />
                  contact@wmspro.vn
                </a>
                <a href="tel:1900123456" className="flex items-center gap-3 hover:text-white transition-colors">
                  <Phone className="w-4 h-4" />
                  1900 123 456
                </a>
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 mt-0.5" />
                  <span>Tầng 15, Tòa nhà Viettel, 285 Cách Mạng Tháng 8, Q.10, TP.HCM</span>
                </div>
              </div>
            </div>

            {Object.entries(footerLinks).map(([key, section]) => (
              <div key={key}>
                <h3 className="font-semibold text-white mb-4">{section.title}</h3>
                <ul className="space-y-3">
                  {section.links.map((link) => (
                    <li key={link.label}>
                      <a 
                        href={link.href}
                        className="text-sm text-navy-300 hover:text-white transition-colors"
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

        <div className="py-6 border-t border-navy-700 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-navy-400">
            © 2024 WMS Pro. Bản quyền thuộc về Công ty TNHH WMS Pro Việt Nam.
          </p>
          
          <div className="flex items-center gap-4">
            {socialLinks.map((social) => {
              const Icon = social.icon
              return (
                <a
                  key={social.label}
                  href={social.href}
                  className="w-10 h-10 bg-navy-800 rounded-lg flex items-center justify-center text-navy-400 hover:bg-primary-600 hover:text-white transition-all"
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

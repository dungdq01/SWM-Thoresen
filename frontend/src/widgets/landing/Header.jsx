import { useState, useEffect } from 'react'
import { Menu, X, Box } from 'lucide-react'
import { Button } from '@shared/ui'
import { cn } from '@shared/lib/cn'
import { motion, AnimatePresence } from 'framer-motion'

const navLinks = [
  { label: 'Tính năng', href: '#features' },
  { label: 'Giải pháp', href: '#solutions' },
  { label: 'Bảng giá', href: '#pricing' },
  { label: 'Liên hệ', href: '#contact' },
]

export function Header() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        isScrolled 
          ? 'bg-white/95 backdrop-blur-md shadow-soft py-3' 
          : 'bg-transparent py-5'
      )}
    >
      <div className="container-custom">
        <nav className="flex items-center justify-between">
          <motion.a 
            href="#"
            className="flex items-center gap-3"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center">
              <Box className="w-6 h-6 text-white" />
            </div>
            <span className={cn(
              'text-xl font-bold transition-colors',
              isScrolled ? 'text-navy-900' : 'text-navy-900'
            )}>
              WMS Pro
            </span>
          </motion.a>

          <motion.div 
            className="hidden md:flex items-center gap-8"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className={cn(
                  'text-sm font-medium transition-colors hover:text-primary-600',
                  isScrolled ? 'text-navy-700' : 'text-navy-700'
                )}
              >
                {link.label}
              </a>
            ))}
          </motion.div>

          <motion.div 
            className="hidden md:flex items-center gap-3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Button variant="primary" size="md">
              Dùng thử miễn phí
            </Button>
            <Button variant="secondary" size="md">
              Đăng nhập
            </Button>
          </motion.div>

          <button
            className="md:hidden p-2 text-navy-700"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </nav>
      </div>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-t border-navy-100 shadow-lg"
          >
            <div className="container-custom py-4 space-y-4">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="block text-navy-700 font-medium py-2 hover:text-primary-600"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {link.label}
                </a>
              ))}
              <div className="pt-4 space-y-3 border-t border-navy-100">
                <Button variant="primary" size="md" className="w-full">
                  Dùng thử miễn phí
                </Button>
                <Button variant="secondary" size="md" className="w-full">
                  Đăng nhập
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}

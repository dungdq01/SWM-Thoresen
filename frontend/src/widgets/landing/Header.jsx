import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Menu, X, ChevronDown } from 'lucide-react'
import { Button } from '@shared/ui'
import { cn } from '@shared/lib/cn'
import { motion, AnimatePresence } from 'framer-motion'

const navLinks = [
  { label: 'Giải pháp', href: '#solutions', hasDropdown: true },
  { label: 'Về chúng tôi', href: '#about' },
  { label: 'Insights', href: '#insights' },
  { label: 'Liên hệ', href: '#contact' },
]

export function Header() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const navigate = useNavigate()

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
        'fixed top-0 left-0 right-0 z-50 transition-all duration-500',
        isScrolled 
          ? 'bg-white shadow-lg py-3' 
          : 'bg-transparent py-4'
      )}
    >
      <div className="container-custom">
        <nav className="flex items-center justify-between">
          {/* Logo */}
          <motion.div 
            className="flex items-center gap-3"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Link to="/" className="flex items-center gap-3 group">
              <img 
                src="/assets/logo.png" 
                alt="SmartLog" 
                className={cn(
                  'h-10 w-auto transition-all duration-300',
                  !isScrolled && 'brightness-0 invert'
                )}
              />
              <div className="flex flex-col">
                <span className={cn(
                  'text-xl font-bold tracking-tight transition-colors',
                  isScrolled ? 'text-navy-900' : 'text-white'
                )}>
                  SmartLog
                </span>
                <span className={cn(
                  'text-[10px] font-medium tracking-widest uppercase transition-colors',
                  isScrolled ? 'text-ice' : 'text-ice-light'
                )}>
                  Warehouse Solutions
                </span>
              </div>
            </Link>
          </motion.div>

          {/* Navigation Links */}
          <motion.div 
            className="hidden lg:flex items-center gap-1"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className={cn(
                  'flex items-center gap-1 px-4 py-2 text-sm font-medium transition-all duration-200 rounded-lg',
                  isScrolled 
                    ? 'text-navy-700 hover:text-navy-900 hover:bg-moon-50' 
                    : 'text-white/90 hover:text-white hover:bg-white/10'
                )}
              >
                {link.label}
                {link.hasDropdown && <ChevronDown className="w-4 h-4" />}
              </a>
            ))}
          </motion.div>

          {/* CTA Buttons */}
          <motion.div 
            className="hidden lg:flex items-center gap-3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <button 
              onClick={() => navigate('/app')}
              className={cn(
                'px-4 py-2 text-sm font-medium transition-all duration-200 rounded-lg',
                isScrolled 
                  ? 'text-navy-700 hover:text-navy-900' 
                  : 'text-white/90 hover:text-white'
              )}
            >
              Đăng nhập
            </button>
            <Button 
              variant="accent" 
              size="md" 
              onClick={() => navigate('/app')}
              className={cn(
                'shadow-lg',
                !isScrolled && 'bg-ice hover:bg-ice-light text-navy-900'
              )}
            >
              Vào ứng dụng
            </Button>
          </motion.div>

          {/* Mobile Menu Button */}
          <button
            className={cn(
              'lg:hidden p-2 rounded-lg transition-colors',
              isScrolled ? 'text-navy-700 hover:bg-moon-50' : 'text-white hover:bg-white/10'
            )}
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </nav>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden bg-white border-t border-moon-100 shadow-xl"
          >
            <div className="container-custom py-6 space-y-2">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="flex items-center justify-between text-navy-700 font-medium py-3 px-4 rounded-lg hover:bg-moon-50 transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {link.label}
                  {link.hasDropdown && <ChevronDown className="w-4 h-4 text-navy-400" />}
                </a>
              ))}
              <div className="pt-4 mt-4 space-y-3 border-t border-moon-100">
                <Button variant="outline" size="md" className="w-full" onClick={() => { setIsMobileMenuOpen(false); navigate('/app') }}>
                  Đăng nhập
                </Button>
                <Button variant="accent" size="md" className="w-full" onClick={() => { setIsMobileMenuOpen(false); navigate('/app') }}>
                  Vào ứng dụng
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}

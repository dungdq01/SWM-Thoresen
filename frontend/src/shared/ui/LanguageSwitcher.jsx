import { Languages } from 'lucide-react'
import { useLanguage } from '@shared/i18n'
import { cn } from '@shared/lib/cn'

export function LanguageSwitcher({ variant = 'default', className }) {
  const { language, toggleLanguage, t } = useLanguage()

  if (variant === 'sidebar') {
    return (
      <button
        onClick={toggleLanguage}
        className={cn(
          'flex items-center gap-2 w-full px-3 py-2 text-sm rounded-xl transition-colors',
          'text-moon-100/80 hover:bg-sidebar-hover hover:text-moon-50',
          className
        )}
        title={t('common.language')}
      >
        <Languages className="h-4 w-4" />
        <span className="flex-1 text-left">{language === 'en' ? 'EN' : 'VI'}</span>
        <span className="text-xs text-moon-100/50">
          {language === 'en' ? t('common.vietnamese') : t('common.english')}
        </span>
      </button>
    )
  }

  return (
    <button
      onClick={toggleLanguage}
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-xl border transition-colors',
        'border-moon-200 bg-white text-navy-700 hover:bg-moon-50 hover:border-moon-300',
        className
      )}
      title={t('common.language')}
    >
      <Languages className="h-4 w-4" />
      <span>{language === 'en' ? 'EN' : 'VI'}</span>
    </button>
  )
}

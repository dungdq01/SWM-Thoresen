import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { translations } from './translations'

const LANGUAGE_STORAGE_KEY = 'swm-language'

const LanguageContext = createContext(null)

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY)
    return stored || 'en'
  })

  const setLanguage = useCallback((lang) => {
    setLanguageState(lang)
    localStorage.setItem(LANGUAGE_STORAGE_KEY, lang)
  }, [])

  const t = useCallback((key) => {
    const keys = key.split('.')
    let value = translations[language]
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k]
      } else {
        console.warn(`Translation missing for key: ${key} in language: ${language}`)
        return key
      }
    }
    
    return typeof value === 'string' ? value : key
  }, [language])

  const toggleLanguage = useCallback(() => {
    setLanguage(language === 'en' ? 'vi' : 'en')
  }, [language, setLanguage])

  useEffect(() => {
    document.documentElement.lang = language
  }, [language])

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, toggleLanguage }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}

export function useTranslation() {
  const { t } = useLanguage()
  return t
}

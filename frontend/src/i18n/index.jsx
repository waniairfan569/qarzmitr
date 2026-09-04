import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { STRINGS } from './strings'

const STORAGE_KEY = 'qarzmitr_language'
const LanguageContext = createContext(null)

export const LANGUAGES = [
  { id: 'en', label: 'English', short: 'EN' },
  { id: 'ur', label: 'اردو', short: 'اردو' },
]

function readStored() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored === 'ur' || stored === 'en' ? stored : 'en'
  } catch {
    // A private window can refuse storage entirely; English is the safe default.
    return 'en'
  }
}

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(readStored)

  // Direction and language live on <html> so the browser handles bidirectional
  // text, and so CSS can switch the interface font for Urdu.
  useEffect(() => {
    const root = document.documentElement
    root.lang = language
    root.dir = language === 'ur' ? 'rtl' : 'ltr'
    try {
      localStorage.setItem(STORAGE_KEY, language)
    } catch {
      // Not being able to remember the choice is not worth failing over.
    }
  }, [language])

  const t = useCallback((key, replacements) => {
    const entry = STRINGS[key]
    if (!entry) return key

    let text = language === 'ur' ? entry[1] : entry[0]
    if (replacements) {
      for (const [name, value] of Object.entries(replacements)) {
        text = text.split(`{${name}}`).join(String(value))
      }
    }
    return text
  }, [language])

  const value = useMemo(() => ({
    language,
    setLanguage,
    isUrdu: language === 'ur',
    dir: language === 'ur' ? 'rtl' : 'ltr',
    t,
  }), [language, t])

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) throw new Error('useLanguage must be used inside LanguageProvider.')
  return context
}

/** Shorthand for components that only need the translator. */
export function useT() {
  return useLanguage().t
}

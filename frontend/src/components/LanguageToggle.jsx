import { Languages } from 'lucide-react'
import { LANGUAGES, useLanguage } from '../i18n'

/**
 * Switches the whole interface between English and Urdu.
 *
 * Both audiences are real and they do not overlap: a loan officer or an
 * assessor reads English, a shopkeeper reads Urdu — and the one who most needs
 * this product is the one least served by an English interface.
 */
export default function LanguageToggle({ inverse = false }) {
  const { language, setLanguage } = useLanguage()

  const shell = inverse ? 'bg-white/10' : 'bg-ink/[0.06]'
  const idle = inverse ? 'text-paper/65 hover:text-paper' : 'text-ink/55 hover:text-ink'
  const active = inverse ? 'bg-paper text-ink' : 'bg-ink text-paper'

  return (
    <div className={`flex items-center gap-1 rounded-full p-1 ${shell}`} role="group" aria-label="Language / زبان">
      <Languages className={`ms-1.5 hidden sm:block ${inverse ? 'text-paper/50' : 'text-ink/40'}`} size={14} aria-hidden="true" />
      {LANGUAGES.map((option) => (
        <button
          key={option.id}
          type="button"
          lang={option.id}
          aria-pressed={language === option.id}
          className={`rounded-full px-2.5 py-1.5 text-xs font-bold transition sm:px-3 ${language === option.id ? active : idle}`}
          onClick={() => setLanguage(option.id)}
        >
          {option.short}
        </button>
      ))}
    </div>
  )
}

import { CheckCircle2, ScanLine, ShieldCheck, Sparkles } from 'lucide-react'
import { useT } from '../i18n'

// Keys only — the wording lives in the dictionary so this page reads in
// whichever language the visitor chose, like the rest of the app.
const STEPS = ['how.step1', 'how.step2', 'how.step3', 'how.step4', 'how.step5']
const TOOLS = ['how.tool1', 'how.tool2', 'how.tool3', 'how.tool4']
const TRUST = ['how.trust1', 'how.trust2', 'how.trust3', 'how.trust4']

export default function FeatureOverview({ inverse = false, showIntro = true }) {
  const t = useT()
  const mutedText = inverse ? 'text-paper/65' : 'text-ink/60'
  const moduleBorder = inverse ? 'border-paper/10' : 'border-ink/10'
  const moduleSurface = inverse ? 'bg-paper/[0.055]' : 'bg-paper/60'
  const eyebrow = inverse ? 'text-paper/45' : 'text-ink/45'

  return (
    <div className="relative z-10">
      {showIntro && (
        <div className="max-w-2xl">
          <div className={`inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] ${inverse ? 'text-saffron' : 'text-saffron-dark'}`}>
            <ScanLine size={15} /> {t(`how.eyebrow`)}
          </div>
          <h1 className="mt-4 max-w-xl font-display text-4xl leading-[0.98] sm:text-5xl xl:text-6xl">
            {t(`how.headline`)}
          </h1>
          <p className={`mt-4 max-w-xl text-sm font-semibold leading-6 ${mutedText}`}>{t(`how.noApp`)}</p>
          <p className={`mt-4 max-w-xl text-sm leading-6 ${mutedText}`}>{t(`how.intro`)}</p>
        </div>
      )}

      <div className={showIntro ? 'mt-8' : ''}>
        <p className={`text-[10px] font-bold uppercase tracking-[0.2em] ${eyebrow}`}>{t(`how.stepsLabel`)}</p>
        <ol className="mt-4 grid gap-2.5">
          {STEPS.map((key, index) => (
            <li key={key} className={`grid grid-cols-[2.25rem_1fr] items-start gap-3 rounded-2xl border p-3.5 ${moduleBorder} ${moduleSurface}`}>
              <span className={`grid h-9 w-9 place-items-center rounded-full font-display text-sm ${inverse ? 'bg-saffron text-ink' : 'bg-ink text-paper'}`} aria-hidden="true">
                {String(index + 1).padStart(2, '0')}
              </span>
              <div>
                <h2 className="text-sm font-bold">{t(key)}</h2>
                <p className={`mt-0.5 text-xs leading-5 ${mutedText}`}>{t(`${key}.body`)}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <div className={`mt-5 border-t pt-5 ${moduleBorder}`}>
        <div className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] ${eyebrow}`}>
          <Sparkles size={15} className="text-saffron" /> {t(`how.alsoLabel`)}
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {TOOLS.map((key) => (
            <div key={key} className={`rounded-xl border p-3 ${moduleBorder} ${moduleSurface}`}>
              <h3 className="text-xs font-bold">{t(key)}</h3>
              <p className={`mt-0.5 text-xs leading-5 ${mutedText}`}>{t(`${key}.body`)}</p>
            </div>
          ))}
        </div>
      </div>

      <div className={`mt-5 border-t pt-5 ${moduleBorder}`}>
        <div className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] ${eyebrow}`}>
          <ShieldCheck size={15} className="text-saffron" /> {t(`how.trustLabel`)}
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {TRUST.map((key) => (
            <p key={key} className={`flex items-start gap-2 text-xs leading-5 ${mutedText}`}>
              <CheckCircle2 className="mt-0.5 shrink-0 text-saffron" size={14} />{t(key)}
            </p>
          ))}
        </div>
      </div>
    </div>
  )
}

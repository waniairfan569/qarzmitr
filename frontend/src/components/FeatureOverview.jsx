import { CheckCircle2, ScanLine, ShieldCheck } from 'lucide-react'

const MODULES = [
  {
    title: 'Secure account',
    description: 'Sign up as a shopkeeper; JWT authentication keeps each ledger private.',
  },
  {
    title: 'Snap your ledger',
    description: 'Upload a photo; Qwen-VL reads handwritten Urdu and English.',
  },
  {
    title: 'Auto-structure',
    description: 'Qwen turns messy lines into clean sales, expenses, credit given, and repayments.',
  },
  {
    title: 'Credit score',
    description: 'Transparent code calculates 0–100 from cash flow, repayment ratio, and revenue trend; AI explains it in plain Urdu.',
  },
  {
    title: 'Dashboard',
    description: 'See your score card, transaction history, and score-over-time trend in one place.',
  },
]

const TRUST_POINTS = [
  'Auditable code—not AI—calculates every score.',
  'Unclear OCR is flagged as uncertain, never hidden or guessed.',
]

export default function FeatureOverview({ inverse = false, showIntro = true }) {
  const mutedText = inverse ? 'text-paper/65' : 'text-ink/60'
  const moduleBorder = inverse ? 'border-paper/10' : 'border-ink/10'
  const moduleSurface = inverse ? 'bg-paper/[0.055]' : 'bg-paper/60'

  return (
    <div className="relative z-10">
      {showIntro && (
        <div className="max-w-2xl">
          <div className={`inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] ${inverse ? 'text-saffron' : 'text-saffron-dark'}`}>
            <ScanLine size={15} /> Financial inclusion, page by page
          </div>
          <h1 className="mt-4 max-w-xl font-display text-4xl leading-[0.98] sm:text-5xl xl:text-6xl">
            Paper ledgers → verifiable credit score.
          </h1>
          <p className={`mt-4 max-w-xl text-sm font-semibold leading-6 ${mutedText}`}>No banking app required.</p>
          <p className={`mt-4 max-w-xl text-sm leading-6 ${mutedText}`}>
            The financial data already exists on paper. QarzMitr reads, structures, and scores it—without changing how a shopkeeper works.
          </p>
        </div>
      )}

      <div className={showIntro ? 'mt-8' : ''}>
        <p className={`text-[10px] font-bold uppercase tracking-[0.2em] ${inverse ? 'text-paper/45' : 'text-ink/45'}`}>How it works · five clear steps</p>
        <ol className="mt-4 grid gap-2.5">
          {MODULES.map((module, index) => (
            <li key={module.title} className={`grid grid-cols-[2.25rem_1fr] items-start gap-3 rounded-2xl border p-3.5 ${moduleBorder} ${moduleSurface}`}>
              <span className={`grid h-9 w-9 place-items-center rounded-full font-display text-sm ${inverse ? 'bg-saffron text-ink' : 'bg-ink text-paper'}`} aria-hidden="true">
                {String(index + 1).padStart(2, '0')}
              </span>
              <div>
                <h2 className="text-sm font-bold">{module.title}</h2>
                <p className={`mt-0.5 text-xs leading-5 ${mutedText}`}>{module.description}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <div className={`mt-5 border-t pt-5 ${moduleBorder}`}>
        <div className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] ${inverse ? 'text-paper/45' : 'text-ink/45'}`}>
          <ShieldCheck size={15} className="text-saffron" /> Why trust this
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
          {TRUST_POINTS.map((point) => (
            <p key={point} className={`flex items-start gap-2 text-xs leading-5 ${mutedText}`}>
              <CheckCircle2 className="mt-0.5 shrink-0 text-saffron" size={14} />{point}
            </p>
          ))}
        </div>
      </div>
    </div>
  )
}

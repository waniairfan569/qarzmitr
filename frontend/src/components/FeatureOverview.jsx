import { CheckCircle2, ScanLine, ShieldCheck, Sparkles } from 'lucide-react'

// The pipeline: what happens to a page once it is photographed.
const MODULES = [
  {
    title: 'Secure account',
    description: 'Sign up with an email or with Google; each shopkeeper’s ledger stays private to them.',
  },
  {
    title: 'Snap your ledger',
    description: 'Upload a photo; Qwen-VL reads handwritten Urdu and English exactly as written.',
  },
  {
    title: 'Auto-structure',
    description: 'Qwen turns messy lines into clean sales, expenses, credit given, and repayments.',
  },
  {
    title: 'Credit score',
    description: 'Transparent code calculates 0–100 from cash flow, repayment ratio, and revenue trend; AI only explains it in plain Urdu.',
  },
  {
    title: 'Your dashboard',
    description: 'Score, the weeks it was measured on, and how far you are from a lender saying yes.',
  },
]

// What the same photograph is worth on an ordinary day, before any loan.
const DAILY_TOOLS = [
  ['Udhaar book', 'Who owes you, what they have paid back, and how old the debt is.'],
  ['Ready reminders', 'A polite Urdu message for each customer who owes — copy it and send it.'],
  ['Trading history', 'Sales, expenses and net income by day, week, month or year.'],
  ['Entries to check', 'Anything read uncertainly is listed for you to correct or confirm.'],
]

const TRUST_POINTS = [
  'Auditable code—not AI—calculates every score.',
  'Unclear readings are flagged, never hidden—and you can correct them.',
  'Your score explanation and reminders can be read aloud.',
  'A lender view shows the same evidence, never a different answer.',
]

export default function FeatureOverview({ inverse = false, showIntro = true }) {
  const mutedText = inverse ? 'text-paper/65' : 'text-ink/60'
  const moduleBorder = inverse ? 'border-paper/10' : 'border-ink/10'
  const moduleSurface = inverse ? 'bg-paper/[0.055]' : 'bg-paper/60'
  const eyebrow = inverse ? 'text-paper/45' : 'text-ink/45'

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
        <p className={`text-[10px] font-bold uppercase tracking-[0.2em] ${eyebrow}`}>How it works · five clear steps</p>
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
        <div className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] ${eyebrow}`}>
          <Sparkles size={15} className="text-saffron" /> What the same photo also gives you
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {DAILY_TOOLS.map(([title, description]) => (
            <div key={title} className={`rounded-xl border p-3 ${moduleBorder} ${moduleSurface}`}>
              <h3 className="text-xs font-bold">{title}</h3>
              <p className={`mt-0.5 text-xs leading-5 ${mutedText}`}>{description}</p>
            </div>
          ))}
        </div>
      </div>

      <div className={`mt-5 border-t pt-5 ${moduleBorder}`}>
        <div className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] ${eyebrow}`}>
          <ShieldCheck size={15} className="text-saffron" /> Why trust this
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
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

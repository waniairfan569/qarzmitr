import { useState } from 'react'
import { CalendarDays } from 'lucide-react'
import { useT } from '../i18n'

const DAY_MS = 24 * 60 * 60 * 1000

function iso(date) {
  return date.toISOString().slice(0, 10)
}

/**
 * Presets first, calendar second.
 *
 * The question a shopkeeper actually asks is "how did today go" or "what came
 * in this week" — not "show me 12 August to 19 August". The date inputs are
 * there for when a specific day is genuinely wanted, but they are not what the
 * eye lands on.
 */
export function presetRange(preset, today = new Date()) {
  const end = iso(today)

  if (preset === 'today') return { from: end, to: end }
  if (preset === 'week') {
    // Monday-anchored, matching the weeks the score is measured on.
    const weekday = (today.getDay() + 6) % 7
    return { from: iso(new Date(today.getTime() - (weekday * DAY_MS))), to: end }
  }
  if (preset === 'month') {
    return { from: `${end.slice(0, 7)}-01`, to: end }
  }
  return { from: '', to: '' }
}

const PRESETS = ['today', 'week', 'month', 'all']

export default function DateRangeFilter({ value, onChange, disabled }) {
  const t = useT()
  const [showDates, setShowDates] = useState(false)
  const datesOpen = showDates || value.preset === 'custom'

  function choose(preset) {
    setShowDates(false)
    onChange({ preset, ...presetRange(preset) })
  }

  function setDate(field, date) {
    onChange({ preset: 'custom', ...value, [field]: date })
  }

  // Everything sits on one row and wraps only when the screen is genuinely too
  // narrow, so the whole filter reads as a single control rather than a stack.
  return (
    <>
      <div className="flex flex-wrap items-center gap-1 rounded-full bg-ink/[0.06] p-1" role="group" aria-label={t(`txn.period`)}>
        {PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            disabled={disabled}
            aria-pressed={value.preset === preset}
            className={`rounded-full px-3.5 py-2 text-xs font-bold whitespace-nowrap transition ${
              value.preset === preset ? 'bg-ink text-paper' : 'text-ink/60 hover:text-ink'
            }`}
            onClick={() => choose(preset)}
          >
            {t(`txn.${preset}`)}
          </button>
        ))}
        <button
          type="button"
          disabled={disabled}
          aria-pressed={value.preset === 'custom'}
          aria-expanded={datesOpen}
          className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-bold whitespace-nowrap transition ${
            value.preset === 'custom' ? 'bg-ink text-paper' : 'text-ink/60 hover:text-ink'
          }`}
          onClick={() => setShowDates((open) => !open)}
        >
          <CalendarDays size={14} /> {t(`txn.custom`)}
        </button>
      </div>

      {datesOpen && (
        <div className="flex items-center gap-2 rounded-full border border-ink/12 bg-cream/70 px-3 py-1.5">
          <input
            className="border-0 bg-transparent p-0 text-xs font-bold text-ink outline-none"
            type="date"
            aria-label={t(`txn.from`)}
            value={value.from || ''}
            max={value.to || undefined}
            disabled={disabled}
            onChange={(event) => setDate('from', event.target.value)}
          />
          <span aria-hidden="true" className="text-ink/35">–</span>
          <input
            className="border-0 bg-transparent p-0 text-xs font-bold text-ink outline-none"
            type="date"
            aria-label={t(`txn.to`)}
            value={value.to || ''}
            min={value.from || undefined}
            disabled={disabled}
            onChange={(event) => setDate('to', event.target.value)}
          />
        </div>
      )}
    </>
  )
}

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

  function choose(preset) {
    setShowDates(false)
    onChange({ preset, ...presetRange(preset) })
  }

  function setDate(field, date) {
    onChange({ preset: 'custom', ...value, [field]: date })
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <div className="flex flex-wrap gap-1 rounded-full bg-ink/[0.06] p-1" role="group" aria-label={t(`txn.from`)}>
        {PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            disabled={disabled}
            aria-pressed={value.preset === preset}
            className={`rounded-full px-3.5 py-2 text-xs font-bold transition ${
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
          aria-expanded={showDates}
          className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-bold transition ${
            value.preset === 'custom' ? 'bg-ink text-paper' : 'text-ink/60 hover:text-ink'
          }`}
          onClick={() => setShowDates((open) => !open)}
        >
          <CalendarDays size={14} /> {t(`txn.custom`)}
        </button>
      </div>

      {(showDates || value.preset === 'custom') && (
        <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-ink/10 bg-cream/70 p-3">
          <label className="block">
            <span className="field-label">{t(`txn.from`)}</span>
            <input
              className="input-field !mt-1 !py-2 !text-sm"
              type="date"
              value={value.from || ''}
              max={value.to || undefined}
              disabled={disabled}
              onChange={(event) => setDate('from', event.target.value)}
            />
          </label>
          <label className="block">
            <span className="field-label">{t(`txn.to`)}</span>
            <input
              className="input-field !mt-1 !py-2 !text-sm"
              type="date"
              value={value.to || ''}
              min={value.from || undefined}
              disabled={disabled}
              onChange={(event) => setDate('to', event.target.value)}
            />
          </label>
        </div>
      )}
    </div>
  )
}

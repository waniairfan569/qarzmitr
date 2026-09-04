import { ArrowUpRight, Sparkles } from 'lucide-react'
import { useT } from '../i18n'

function scoreTone(score) {
  if (score < 40) return { accent: 'text-coral', ring: 'stroke-coral', labelKey: 'score.tone.low' }
  if (score < 70) return { accent: 'text-saffron-dark', ring: 'stroke-saffron', labelKey: 'score.tone.mid' }
  return { accent: 'text-leaf', ring: 'stroke-leaf', labelKey: 'score.tone.high' }
}

export default function ScoreCard({ latestScore }) {
  const t = useT()
  if (!latestScore) {
    return (
      <section className="card relative min-h-[330px] overflow-hidden p-7 md:p-9">
        <div className="relative flex h-full min-h-[270px] flex-col justify-between">
          <div className="section-kicker">{t(`score.profile`)}</div>
          <div>
            <p className="font-display text-5xl leading-[0.95] md:text-6xl">{t(`score.emptyTitle`)}</p>
            <p className="mt-5 max-w-md text-sm leading-6 text-ink/65">{t(`score.emptyBody`)}</p>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.15em] text-leaf">
            {t(`score.beginBelow`)} <ArrowUpRight size={15} />
          </div>
        </div>
      </section>
    )
  }

  const tone = scoreTone(latestScore.score)
  const circumference = 2 * Math.PI * 72
  const progress = circumference - (latestScore.score / 100) * circumference

  return (
    <section className="card relative overflow-hidden p-7 md:p-9">
      <div className="flex items-start justify-between">
        <div>
          <div className="section-kicker">{t(`score.kicker`)}</div>
          <p className="mt-2 text-sm text-ink/70">{t(`score.updated`, { date: new Date(latestScore.computed_at).toLocaleDateString() })}</p>
        </div>
        <Sparkles className="text-saffron-dark" size={22} />
      </div>
      <div className="mt-8 grid items-center gap-8 sm:grid-cols-[180px_1fr]">
        <div className="relative h-[180px] w-[180px]">
          <svg className="h-full w-full -rotate-90" viewBox="0 0 168 168" role="img" aria-label={`Credit score ${latestScore.score} out of 100`}>
            <circle cx="84" cy="84" r="72" fill="none" stroke="rgba(23,57,52,.12)" strokeWidth="8" />
            <circle className={`${tone.ring} transition-all duration-1000`} cx="84" cy="84" r="72" fill="none" strokeLinecap="round" strokeWidth="8" strokeDasharray={circumference} strokeDashoffset={progress} />
          </svg>
          <div className="absolute inset-0 grid place-content-center text-center">
            <strong className={`font-display text-6xl leading-none ${tone.accent}`}>{latestScore.score}</strong>
            <span className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-ink/70">{t(`score.outOf`)}</span>
          </div>
        </div>
        <div>
          <span className={`inline-flex rounded-full bg-ink/[0.07] px-3 py-1.5 text-xs font-bold ${tone.accent}`}>{t(tone.labelKey)}</span>
          <p className="mt-5 text-sm leading-6 text-ink/75">{t(`score.note`)}<strong className="font-bold text-leaf">{t(`score.noteStrong`)}</strong></p>
        </div>
      </div>
    </section>
  )
}

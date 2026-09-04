import { ShieldCheck } from 'lucide-react'
import BrandMark from './BrandMark'
import FeatureOverview from './FeatureOverview'

export default function AuthFrame({ eyebrow, title, subtitle, children }) {
  return (
    <main className="min-h-screen bg-ink text-paper lg:grid lg:grid-cols-[1.12fr_0.88fr]">
      <section className="auth-atmosphere relative overflow-hidden px-5 py-8 sm:px-10 lg:min-h-screen lg:px-10 lg:py-10 xl:px-14">
        <div className="mx-auto max-w-2xl">
          <div className="mb-10"><BrandMark inverse /></div>
          <FeatureOverview inverse />
        </div>
      </section>

      <section className="relative grid place-items-center bg-paper px-5 py-10 text-ink sm:px-10 lg:min-h-screen">
        <div className="paper-grid absolute inset-0 opacity-50" aria-hidden="true" />
        <div className="relative w-full max-w-md animate-rise">
          <div className="mb-10 flex justify-center lg:hidden"><BrandMark /></div>
          <div className="mb-8">
            <div className="section-kicker">{eyebrow}</div>
            <h2 className="mt-3 font-display text-5xl leading-tight">{title}</h2>
            <p className="mt-3 text-sm leading-6 text-ink/55">{subtitle}</p>
          </div>
          {children}
          <div className="mt-8 flex items-center justify-center gap-2 text-xs font-semibold text-ink/40"><ShieldCheck size={14} /> Your records stay private to your account.</div>
        </div>
      </section>
    </main>
  )
}

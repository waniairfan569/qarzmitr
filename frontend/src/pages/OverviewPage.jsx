import { ArrowLeft, BadgeInfo } from 'lucide-react'
import { Link } from 'react-router-dom'
import AppShell from '../components/AppShell'
import FeatureOverview from '../components/FeatureOverview'
import { useT } from '../i18n'

export default function OverviewPage() {
  const t = useT()
  return (
    <AppShell>
      <div className="mx-auto w-full">
        <Link className="text-button inline-flex items-center gap-2" to="/dashboard">
          <ArrowLeft size={15} /> {t(`lender.back`)}
        </Link>

        <section className="auth-atmosphere relative mt-6 overflow-hidden rounded-[2rem] border border-ink/10 p-6 text-paper shadow-[0_24px_70px_rgba(23,57,52,0.14)] sm:p-9 lg:p-12">
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full border border-paper/10 shadow-[0_0_0_42px_rgba(255,250,240,0.025),0_0_0_84px_rgba(255,250,240,0.02)]" aria-hidden="true" />
          <FeatureOverview inverse />
        </section>

        <div className="mt-5 flex items-start gap-3 rounded-2xl border border-ink/10 bg-cream/70 p-4 text-xs leading-5 text-ink/55">
          <BadgeInfo className="mt-0.5 shrink-0 text-saffron-dark" size={17} />
          <p>{t(`footer.prototype`)}</p>
        </div>
      </div>
    </AppShell>
  )
}

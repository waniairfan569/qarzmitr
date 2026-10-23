import { Camera, CircleHelp, Gauge, Landmark, ListChecks, LogOut, ShieldCheck, Users } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useT } from '../i18n'
import LanguageToggle from './LanguageToggle'
import BrandMark from './BrandMark'

// The five things a shopkeeper comes here to do, in the order they do them.
// The lender statement belongs to Loans, so that tab stays lit on /lender.
const NAV = [
  { id: 'home', to: '/dashboard', icon: Gauge },
  { id: 'add', to: '/dashboard/add', icon: Camera },
  { id: 'udhaar', to: '/dashboard/udhaar', icon: Users },
  { id: 'loans', to: '/dashboard/loans', icon: Landmark, alsoOn: ['/lender'] },
  { id: 'records', to: '/dashboard/records', icon: ListChecks },
]

function isActive(item, pathname) {
  if (item.id === 'home') return pathname === '/dashboard' || pathname === '/dashboard/'
  return pathname.startsWith(item.to) || (item.alsoOn || []).some((path) => pathname.startsWith(path))
}

export default function AppShell({ children, badges = {} }) {
  const { user, logout } = useAuth()
  const { pathname } = useLocation()
  const t = useT()

  return (
    <div className="min-h-screen bg-paper text-ink">
      <div className="paper-grid fixed inset-0 pointer-events-none opacity-50" aria-hidden="true" />
      <header className="no-print sticky top-0 z-30 border-b border-ink/10 bg-paper/90 backdrop-blur-xl">
        <div className="mx-auto flex items-center justify-between px-5 py-4 md:px-10">
          <Link to="/dashboard" aria-label="QarzMitr"><BrandMark /></Link>
          <div className="flex items-center gap-3 md:gap-5">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-bold text-ink">{user?.shop_name || user?.name}</p>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink/45">{t(`shell.workspace`)}</p>
            </div>
            <LanguageToggle />
            <div className="hidden h-9 w-px bg-ink/10 sm:block" />
            <Link className="inline-flex min-h-10 items-center gap-2 rounded-full border border-ink/10 px-3 text-xs font-bold text-leaf transition hover:-translate-y-0.5 hover:bg-cream" to="/overview" title={t(`shell.howItWorks`)}>
              <CircleHelp size={16} /> <span className="hidden sm:inline">{t(`shell.howItWorks`)}</span>
            </Link>
            <div className="hidden items-center gap-2 rounded-full bg-leaf/10 px-3 py-2 text-xs font-bold text-leaf lg:flex">
              <ShieldCheck size={14} /> {t(`shell.private`)}
            </div>
            <button className="icon-button" type="button" onClick={logout} title={t(`shell.logout`)} aria-label={t(`shell.logout`)}>
              <LogOut size={18} />
            </button>
          </div>
        </div>

        {/* Wide screens: a row of sections under the header. */}
        <nav className="mx-auto hidden px-5 md:block md:px-10" aria-label={t(`nav.aria`)}>
          <ul className="-mb-px flex gap-1">
            {NAV.map((item) => {
              const active = isActive(item, pathname)
              return (
                <li key={item.id}>
                  <Link
                    to={item.to}
                    aria-current={active ? 'page' : undefined}
                    className={`inline-flex items-center gap-2 border-b-2 px-4 pb-3 pt-1 text-sm font-bold transition ${
                      active ? 'border-saffron text-ink' : 'border-transparent text-ink/50 hover:text-ink'
                    }`}
                  >
                    <item.icon size={16} /> {t(`nav.${item.id}`)}
                    {badges[item.id] > 0 && <Badge value={badges[item.id]} />}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
      </header>

      <main className="relative mx-auto px-5 pb-28 pt-8 md:px-10 md:pb-16 md:pt-10">{children}</main>

      {/* Phones: a tab bar within thumb reach, clear of the home indicator. */}
      <nav
        className="no-print fixed inset-x-0 bottom-0 z-40 border-t border-ink/10 bg-paper/95 backdrop-blur-xl md:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        aria-label={t(`nav.aria`)}
      >
        <ul className="grid grid-cols-5">
          {NAV.map((item) => {
            const active = isActive(item, pathname)
            return (
              <li key={item.id}>
                <Link
                  to={item.to}
                  aria-current={active ? 'page' : undefined}
                  className={`relative flex min-h-16 flex-col items-center justify-center gap-1 px-1 text-[11px] font-bold leading-tight ${
                    active ? 'text-ink' : 'text-ink/45'
                  }`}
                >
                  {active && <span className="absolute inset-x-4 top-0 h-0.5 rounded-full bg-saffron" aria-hidden="true" />}
                  <span className="relative">
                    <item.icon size={20} />
                    {badges[item.id] > 0 && <span className="absolute -end-2.5 -top-1.5"><Badge value={badges[item.id]} /></span>}
                  </span>
                  <span className="text-center">{t(`nav.${item.id}`)}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </div>
  )
}

function Badge({ value }) {
  return <span className="rounded-full bg-saffron px-1.5 py-0.5 text-[10px] font-bold leading-none text-ink">{value}</span>
}

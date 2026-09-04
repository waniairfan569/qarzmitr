import { CircleHelp, LogOut, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useT } from '../i18n'
import LanguageToggle from './LanguageToggle'
import BrandMark from './BrandMark'

export default function AppShell({ children }) {
  const { user, logout } = useAuth()
  const t = useT()

  return (
    <div className="min-h-screen bg-paper text-ink">
      <div className="paper-grid fixed inset-0 pointer-events-none opacity-50" aria-hidden="true" />
      <header className="sticky top-0 z-30 border-b border-ink/10 bg-paper/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-5 py-4 md:px-10">
          <BrandMark />
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
      </header>
      <main className="relative mx-auto max-w-[1440px] px-5 pb-16 pt-8 md:px-10 md:pt-12">{children}</main>
    </div>
  )
}

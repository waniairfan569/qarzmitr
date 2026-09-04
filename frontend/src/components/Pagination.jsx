import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useT } from '../i18n'

/**
 * Pages a list that is already loaded in full.
 *
 * The whole ledger arrives in one response — it is one shopkeeper's own book,
 * not a public feed — so paging here is about not putting two hundred rows on
 * screen at once, and does not need another round trip.
 */
export function usePaged(items, perPage = 15) {
  const [page, setPage] = useState(1)
  const total = items.length
  const pages = Math.max(1, Math.ceil(total / perPage))

  // Filtering can shorten the list under our feet; landing on a page that no
  // longer exists would show an empty table with rows sitting behind it.
  useEffect(() => {
    if (page > pages) setPage(1)
  }, [page, pages])

  const start = (page - 1) * perPage
  const visible = items.slice(start, start + perPage)

  return {
    page,
    pages,
    setPage,
    visible,
    total,
    first: total === 0 ? 0 : start + 1,
    last: Math.min(start + perPage, total),
  }
}

export default function Pagination({ page, pages, total, first, last, onPage }) {
  const t = useT()
  if (total === 0) return null

  const button = 'inline-flex min-h-9 items-center gap-1.5 rounded-full border border-ink/12 px-3.5 text-xs font-bold text-ink transition disabled:opacity-40 hover:enabled:bg-ink hover:enabled:text-paper'

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink/10 px-6 py-4 md:px-8">
      <p className="text-xs font-bold text-ink/55">{t(`page.showing`, { first, last, total })}</p>

      {pages > 1 && (
        <div className="flex items-center gap-2">
          <button type="button" className={button} disabled={page <= 1} onClick={() => onPage(page - 1)}>
            <ChevronLeft className="rtl:rotate-180" size={14} /> {t(`page.prev`)}
          </button>
          <span className="px-1 text-xs font-bold text-ink/55">{t(`page.of`, { page, pages })}</span>
          <button type="button" className={button} disabled={page >= pages} onClick={() => onPage(page + 1)}>
            {t(`page.next`)} <ChevronRight className="rtl:rotate-180" size={14} />
          </button>
        </div>
      )}
    </div>
  )
}

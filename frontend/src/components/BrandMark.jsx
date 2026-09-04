export default function BrandMark({ inverse = false }) {
  return (
    <div className="flex items-center gap-3" aria-label="QarzMitr">
      <div className={`relative grid h-10 w-10 place-items-center rounded-full border ${inverse ? 'border-white/30 bg-white/10' : 'border-ink/15 bg-ink'}`}>
        <span className="font-display text-xl leading-none text-saffron">Q</span>
        <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-current bg-coral text-paper" />
      </div>
      <div>
        <p className={`font-display text-xl leading-none ${inverse ? 'text-paper' : 'text-ink'}`}>QarzMitr</p>
        <p className={`mt-1 text-[9px] font-bold uppercase tracking-[0.22em] ${inverse ? 'text-paper/55' : 'text-ink/45'}`}>Paper to possibility</p>
      </div>
    </div>
  )
}

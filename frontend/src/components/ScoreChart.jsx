import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { TrendingUp } from 'lucide-react'

function formatDate(value) {
  return new Intl.DateTimeFormat('en-PK', { day: 'numeric', month: 'short' }).format(new Date(value))
}

export default function ScoreChart({ scoreHistory }) {
  const data = scoreHistory.map((item) => ({ ...item, dateLabel: formatDate(item.computed_at) }))

  return (
    <section className="card min-h-[330px] p-6 md:p-8">
      <div className="flex items-start justify-between">
        <div>
          <div className="section-kicker">Score journey</div>
          <h2 className="mt-2 font-display text-3xl text-ink">Progress over time</h2>
        </div>
        <div className="icon-chip"><TrendingUp size={18} /></div>
      </div>
      {data.length === 0 ? (
        <div className="grid h-[210px] place-content-center text-center">
          <p className="font-display text-2xl text-ink/35">The line begins after your first score.</p>
          <p className="mt-2 text-sm text-ink/45">Each scoring run will appear here.</p>
        </div>
      ) : (
        <div className="mt-5 h-[220px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 5, left: -24, bottom: 0 }}>
              <defs>
                <linearGradient id="scoreFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#e99b2d" stopOpacity={0.32} />
                  <stop offset="100%" stopColor="#e99b2d" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="#183b3620" strokeDasharray="3 5" />
              <XAxis dataKey="dateLabel" axisLine={false} tickLine={false} tick={{ fill: '#687b76', fontSize: 11 }} />
              <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: '#687b76', fontSize: 11 }} />
              <Tooltip contentStyle={{ background: '#173934', border: 0, borderRadius: 12, color: '#fffaf0' }} labelStyle={{ color: '#f0b74f' }} />
              <Area type="monotone" dataKey="score" stroke="#d98520" strokeWidth={3} fill="url(#scoreFill)" dot={{ r: 5, fill: '#fffaf0', stroke: '#d98520', strokeWidth: 3 }} activeDot={{ r: 7 }} />
            </AreaChart>
          </ResponsiveContainer>
          {data.length === 1 && <p className="-mt-1 text-center text-xs text-ink/45">Compute another score later to reveal your trend.</p>}
        </div>
      )}
    </section>
  )
}

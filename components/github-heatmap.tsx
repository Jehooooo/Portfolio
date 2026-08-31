'use client'

import { useEffect, useState } from 'react'

interface ContributionDay {
  date: string
  count: number
  level: 0 | 1 | 2 | 3 | 4
}

interface ContributionWeek {
  days: ContributionDay[]
  firstDay: string
}

interface ContributionData {
  total: { [year: string]: number }
  contributions: ContributionDay[]
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const LEVEL_COLORS = [
  'bg-[#ebedf0] dark:bg-[#161b22] border border-black/10 dark:border-white/8',
  'bg-[#9be9a8] dark:bg-[#0e4429]',
  'bg-[#40c463] dark:bg-[#006d32]',
  'bg-[#30a14e] dark:bg-[#26a641]',
  'bg-[#216e39] dark:bg-[#39d353]',
]

function groupIntoWeeks(days: ContributionDay[]): ContributionWeek[] {
  const weeks: ContributionWeek[] = []
  let currentWeek: ContributionDay[] = []
  days.forEach((day, i) => {
    const dow = new Date(day.date).getDay()
    if (i === 0 && dow !== 0) {
      for (let p = 0; p < dow; p++) currentWeek.push({ date: '', count: 0, level: 0 })
    }
    currentWeek.push(day)
    if (currentWeek.length === 7) {
      weeks.push({ days: currentWeek, firstDay: currentWeek.find((d) => d.date)?.date || '' })
      currentWeek = []
    }
  })
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) currentWeek.push({ date: '', count: 0, level: 0 })
    weeks.push({ days: currentWeek, firstDay: currentWeek.find((d) => d.date)?.date || '' })
  }
  return weeks
}

function getMonthLabels(weeks: ContributionWeek[]) {
  const labels: { month: string; col: number }[] = []
  let lastMonth = -1
  weeks.forEach((week, i) => {
    if (!week.firstDay) return
    const m = new Date(week.firstDay).getMonth()
    if (m !== lastMonth) { labels.push({ month: MONTHS[m], col: i }); lastMonth = m }
  })
  return labels
}

export function GitHubHeatmap({ username }: { username: string }) {
  const [weeks, setWeeks] = useState<ContributionWeek[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null)
  const year = new Date().getFullYear()

  useEffect(() => {
    fetch(`https://github-contributions-api.jogruber.de/v4/${username}?y=${year}`)
      .then((r) => r.json())
      .then((data: ContributionData) => {
        setWeeks(groupIntoWeeks(data.contributions))
        setTotal(data.total[year] ?? 0)
        setLoading(false)
      })
      .catch(() => { setError(true); setLoading(false) })
  }, [username, year])

  const monthLabels = getMonthLabels(weeks)

  return (
    <div className="w-full rounded-2xl border border-border bg-card/60 backdrop-blur-sm px-4 py-4 sm:px-5 sm:py-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="font-mono text-xs font-semibold text-foreground/80 uppercase tracking-wider">
          {loading ? 'Loading contributions…' : error ? 'GitHub Contributions' : `${total} contributions in ${year}`}
        </span>
        <a
          href={`https://github.com/${username}`}
          target="_blank"
          rel="noreferrer"
          className="font-mono text-[10px] text-muted-foreground hover:text-foreground transition-colors shrink-0"
        >
          @{username} ↗
        </a>
      </div>

      {loading ? (
        <div className="flex h-24 items-center justify-center">
          <span className="font-mono text-xs text-muted-foreground animate-pulse">Fetching activity…</span>
        </div>
      ) : error ? (
        <div className="flex h-24 items-center justify-center">
          <span className="font-mono text-xs text-muted-foreground">Unable to load contribution data.</span>
        </div>
      ) : (
        <div className="relative overflow-x-auto">
          {/* Month labels row */}
          <div className="relative mb-1 h-4" style={{ paddingLeft: '28px' }}>
            {monthLabels.map(({ month, col }, i) => (
              <span
                key={i}
                className="absolute font-mono text-[9px] text-muted-foreground"
                style={{ left: `${28 + col * 12.5}px` }}
              >
                {month}
              </span>
            ))}
          </div>

          <div className="relative flex gap-[2px]" style={{ paddingLeft: '28px' }}>
            {/* Day labels */}
            <div className="absolute left-0 top-0 flex flex-col gap-[2px]">
              {['', 'Mon', '', 'Wed', '', 'Fri', ''].map((d, i) => (
                <div key={i} className="h-[10px] font-mono text-[8px] leading-[10px] text-muted-foreground/50">
                  {d}
                </div>
              ))}
            </div>

            {/* Cells */}
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-[2px]">
                {week.days.map((day, di) => (
                  <div
                    key={di}
                    className={`h-[10px] w-[10px] rounded-[2px] transition-opacity duration-150 ${
                      day.date ? `cursor-default hover:opacity-75 ${LEVEL_COLORS[day.level]}` : 'bg-transparent'
                    }`}
                    onMouseEnter={(e) => {
                      if (!day.date) return
                      const r = (e.target as HTMLElement).getBoundingClientRect()
                      const p = (e.target as HTMLElement).closest('.relative')!.getBoundingClientRect()
                      setTooltip({
                        text: `${day.count} contribution${day.count !== 1 ? 's' : ''} · ${new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
                        x: r.left - p.left,
                        y: r.top - p.top - 30,
                      })
                    }}
                    onMouseLeave={() => setTooltip(null)}
                  />
                ))}
              </div>
            ))}

            {tooltip && (
              <div
                className="pointer-events-none absolute z-20 rounded-lg border border-border bg-popover px-2.5 py-1.5 font-mono text-[10px] text-popover-foreground shadow-lg whitespace-nowrap"
                style={{ left: tooltip.x, top: tooltip.y }}
              >
                {tooltip.text}
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="mt-3 flex items-center justify-end gap-1.5">
            <span className="font-mono text-[9px] text-muted-foreground">Less</span>
            {([0, 1, 2, 3, 4] as const).map((l) => (
              <div key={l} className={`h-[10px] w-[10px] rounded-[2px] ${LEVEL_COLORS[l]}`} />
            ))}
            <span className="font-mono text-[9px] text-muted-foreground">More</span>
          </div>
        </div>
      )}
    </div>
  )
}
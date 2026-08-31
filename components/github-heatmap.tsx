'use client'

import { useEffect, useRef, useState } from 'react'

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
    if (m !== lastMonth) {
      labels.push({ month: MONTHS[m], col: i })
      lastMonth = m
    }
  })
  return labels
}

const CURRENT_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: CURRENT_YEAR - 2022 }, (_, i) => CURRENT_YEAR - i)

export function GitHubHeatmap({ username }: { username: string }) {
  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR)
  const [weeks, setWeeks] = useState<ContributionWeek[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null)
  const prevWeeksRef = useRef<ContributionWeek[]>([])
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setLoading(true)
    setError(false)
    fetch(`https://github-contributions-api.jogruber.de/v4/${username}?y=${selectedYear}`)
      .then((r) => r.json())
      .then((data: ContributionData) => {
        const w = groupIntoWeeks(data.contributions || [])
        prevWeeksRef.current = w
        setWeeks(w)
        setTotal(data.total?.[selectedYear] ?? 0)
        setLoading(false)
      })
      .catch(() => {
        setError(true)
        setLoading(false)
      })
  }, [username, selectedYear])

  const displayWeeks = loading && prevWeeksRef.current.length > 0 ? prevWeeksRef.current : weeks
  const monthLabels = getMonthLabels(displayWeeks)

  return (
    <div className="w-full max-w-full min-w-0 overflow-hidden rounded-2xl border border-border bg-card/60 backdrop-blur-sm p-3.5 sm:p-5">
      {/* Header */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <span className="font-mono text-xs font-semibold text-foreground/80 uppercase tracking-wider">
          {loading ? (
            <span className="animate-pulse">Loading contributions...</span>
          ) : error ? (
            'GitHub Contributions'
          ) : (
            `${total} contributions in ${selectedYear}`
          )}
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

      {/* Grid + year sidebar container */}
      <div className="flex flex-col gap-3 sm:flex-row sm:gap-4 sm:items-start min-w-0">
        {/* Heatmap scroll container */}
        <div className="w-full min-w-0 flex-1 overflow-hidden">
          {error && !loading ? (
            <div className="flex h-[88px] items-center justify-center">
              <span className="font-mono text-xs text-muted-foreground">
                Unable to load contribution data.
              </span>
            </div>
          ) : (
            <div
              ref={scrollContainerRef}
              className={`w-full overflow-x-auto overflow-y-hidden pb-2 transition-opacity duration-300 ${
                loading ? 'opacity-40' : 'opacity-100'
              }`}
            >
              {/* Inner wrapper with minimum width matching grid columns */}
              <div className="min-w-[620px] relative">
                {/* Month labels */}
                <div className="relative mb-1.5 h-4" style={{ paddingLeft: '28px' }}>
                  {monthLabels.map(({ month, col }, i) => (
                    <span
                      key={i}
                      className="absolute font-mono text-[9px] text-muted-foreground select-none"
                      style={{ left: `${28 + col * 11.5}px` }}
                    >
                      {month}
                    </span>
                  ))}
                </div>

                <div className="relative flex gap-[2px]" style={{ paddingLeft: '28px' }}>
                  {/* Day labels */}
                  <div className="absolute left-0 top-0 flex flex-col gap-[2px] select-none">
                    {['', 'Mon', '', 'Wed', '', 'Fri', ''].map((d, i) => (
                      <div
                        key={i}
                        className="h-[10px] font-mono text-[8px] leading-[10px] text-muted-foreground/50"
                      >
                        {d}
                      </div>
                    ))}
                  </div>

                  {/* Cells */}
                  {displayWeeks.map((week, wi) => (
                    <div key={wi} className="flex flex-col gap-[2px]">
                      {week.days.map((day, di) => (
                        <div
                          key={di}
                          className={`h-[10px] w-[10px] rounded-[2px] transition-opacity duration-150 ${
                            day.date
                              ? `cursor-default hover:opacity-75 ${LEVEL_COLORS[day.level]}`
                              : 'bg-transparent'
                          }`}
                          onMouseEnter={(e) => {
                            if (!day.date || loading) return
                            const r = (e.target as HTMLElement).getBoundingClientRect()
                            const p = (e.target as HTMLElement)
                              .closest('.relative')!
                              .getBoundingClientRect()
                            setTooltip({
                              text: `${day.count} contribution${
                                day.count !== 1 ? 's' : ''
                              } · ${new Date(day.date).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}`,
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

                {/* Legend + mobile scroll hint */}
                <div className="mt-3 flex items-center justify-between gap-2">
                  <span className="font-mono text-[9px] text-muted-foreground/60 sm:hidden">
                    ← Swipe to view more →
                  </span>
                  <div className="flex items-center gap-1.5 ml-auto">
                    <span className="font-mono text-[9px] text-muted-foreground select-none">
                      Less
                    </span>
                    {([0, 1, 2, 3, 4] as const).map((l) => (
                      <div
                        key={l}
                        className={`h-[10px] w-[10px] rounded-[2px] ${LEVEL_COLORS[l]}`}
                      />
                    ))}
                    <span className="font-mono text-[9px] text-muted-foreground select-none">
                      More
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Year selector */}
        <div className="flex flex-row flex-wrap gap-1.5 sm:flex-col sm:gap-1 sm:shrink-0 pt-1 sm:pt-0">
          {YEARS.map((y) => (
            <button
              key={y}
              type="button"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setSelectedYear(y)
              }}
              className={`font-mono text-[11px] px-2.5 py-1 rounded-lg transition-all duration-150 text-center sm:text-left ${
                selectedYear === y
                  ? 'bg-[#26a641] text-white font-bold shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/60 bg-white/5 sm:bg-transparent'
              }`}
            >
              {y}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
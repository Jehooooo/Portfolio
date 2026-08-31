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

// Theme-aware fill colors
const LEVEL_COLORS_DARK = [
  'rgba(255, 255, 255, 0.05)',
  '#0e4429',
  '#006d32',
  '#26a641',
  '#39d353',
]

const LEVEL_COLORS_LIGHT = [
  '#ebedf0',
  '#9be9a8',
  '#40c463',
  '#30a14e',
  '#216e39',
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
  const containerRef = useRef<HTMLDivElement>(null)
  const prevWeeksRef = useRef<ContributionWeek[]>([])

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

  // Layout coordinates for SVG
  const BOX_SIZE = 10
  const BOX_GAP = 2.5
  const STEP = BOX_SIZE + BOX_GAP
  const LEFT_PADDING = 24
  const TOP_PADDING = 18
  const SVG_WIDTH = LEFT_PADDING + Math.max(53, displayWeeks.length) * STEP + 4
  const SVG_HEIGHT = TOP_PADDING + 7 * STEP + 2

  return (
    <div
      ref={containerRef}
      className="relative w-full max-w-full min-w-0 rounded-2xl border border-border bg-card/60 backdrop-blur-sm p-3.5 sm:p-5"
    >
      {/* Header with Title and Year Selector */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs sm:text-sm font-semibold text-foreground uppercase tracking-wider">
            {loading ? (
              <span className="animate-pulse">Loading contributions...</span>
            ) : error ? (
              'GitHub Contributions'
            ) : (
              `${total} contributions in ${selectedYear}`
            )}
          </span>
        </div>

        {/* Year Selector Pills */}
        <div className="flex items-center gap-1">
          {YEARS.map((y) => (
            <button
              key={y}
              type="button"
              onClick={(e) => {
                e.preventDefault()
                setSelectedYear(y)
              }}
              className={`font-mono text-[10px] sm:text-xs px-2 sm:px-2.5 py-1 rounded-md transition-all duration-150 ${
                selectedYear === y
                  ? 'bg-[#26a641] text-white font-bold shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-white/10 dark:hover:bg-white/10'
              }`}
            >
              {y}
            </button>
          ))}
        </div>
      </div>

      {/* Responsive SVG Heatmap - 100% width, No scrollbars, All months visible */}
      {error && !loading ? (
        <div className="flex h-24 items-center justify-center">
          <span className="font-mono text-xs text-muted-foreground">
            Unable to load contribution data.
          </span>
        </div>
      ) : (
        <div className={`w-full transition-opacity duration-300 ${loading ? 'opacity-40' : 'opacity-100'}`}>
          <svg
            viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
            className="w-full h-auto block select-none overflow-visible"
            aria-label="GitHub Contributions Heatmap"
          >
            {/* Month Labels across top */}
            {monthLabels.map(({ month, col }, i) => (
              <text
                key={i}
                x={LEFT_PADDING + col * STEP}
                y={11}
                className="fill-muted-foreground font-mono text-[9px]"
              >
                {month}
              </text>
            ))}

            {/* Day of week labels */}
            <text x={0} y={TOP_PADDING + 1 * STEP + 8} className="fill-muted-foreground/60 font-mono text-[8px]">
              Mon
            </text>
            <text x={0} y={TOP_PADDING + 3 * STEP + 8} className="fill-muted-foreground/60 font-mono text-[8px]">
              Wed
            </text>
            <text x={0} y={TOP_PADDING + 5 * STEP + 8} className="fill-muted-foreground/60 font-mono text-[8px]">
              Fri
            </text>

            {/* Contribution Cells */}
            {displayWeeks.map((week, wi) => {
              const x = LEFT_PADDING + wi * STEP
              return week.days.map((day, di) => {
                const y = TOP_PADDING + di * STEP
                if (!day.date) return null

                return (
                  <rect
                    key={`${wi}-${di}`}
                    x={x}
                    y={y}
                    width={BOX_SIZE}
                    height={BOX_SIZE}
                    rx={2}
                    ry={2}
                    className="transition-opacity duration-150 cursor-pointer hover:opacity-75 stroke-[0.5px] stroke-black/10 dark:stroke-white/10"
                    fill={LEVEL_COLORS_DARK[day.level]}
                    onMouseEnter={(e) => {
                      if (!day.date || loading || !containerRef.current) return
                      const parentRect = containerRef.current.getBoundingClientRect()
                      const rect = (e.target as SVGElement).getBoundingClientRect()
                      setTooltip({
                        text: `${day.count} contribution${
                          day.count !== 1 ? 's' : ''
                        } · ${new Date(day.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}`,
                        x: rect.left - parentRect.left + rect.width / 2,
                        y: rect.top - parentRect.top - 28,
                      })
                    }}
                    onMouseLeave={() => setTooltip(null)}
                  />
                )
              })
            })}
          </svg>
        </div>
      )}

      {/* Floating Hover Tooltip */}
      {tooltip && (
        <div
          className="pointer-events-none absolute z-30 -translate-x-1/2 rounded-lg border border-border bg-popover px-2.5 py-1 font-mono text-[10px] sm:text-xs text-popover-foreground shadow-xl whitespace-nowrap animate-in fade-in zoom-in-95 duration-100"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          {tooltip.text}
        </div>
      )}

      {/* Footer: Profile Link + Legend */}
      <div className="mt-3 flex items-center justify-between gap-2 border-t border-border/40 pt-2.5">
        <a
          href={`https://github.com/${username}`}
          target="_blank"
          rel="noreferrer"
          className="font-mono text-[10px] sm:text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          github.com/{username} ↗
        </a>

        <div className="flex items-center gap-1.5">
          <span className="font-mono text-[9px] sm:text-[10px] text-muted-foreground select-none">
            Less
          </span>
          {([0, 1, 2, 3, 4] as const).map((l) => (
            <div
              key={l}
              className="h-[9px] w-[9px] sm:h-[10px] sm:w-[10px] rounded-[2px]"
              style={{ backgroundColor: LEVEL_COLORS_DARK[l] }}
            />
          ))}
          <span className="font-mono text-[9px] sm:text-[10px] text-muted-foreground select-none">
            More
          </span>
        </div>
      </div>
    </div>
  )
}
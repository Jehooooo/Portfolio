'use client'

import { useState } from 'react'
import { Reveal } from '@/components/reveal'
import { timelineItems, type TimelineCategory } from '@/lib/portfolio-data'
import { cn } from '@/lib/utils'

export function About() {
  const [activeFilter, setActiveFilter] = useState<'All' | TimelineCategory>('All')

  const categories: { label: 'All' | TimelineCategory; count: number }[] = [
    { label: 'All', count: timelineItems.length },
    {
      label: 'Experience',
      count: timelineItems.filter((i) => i.category === 'Experience').length,
    },
    {
      label: 'Education',
      count: timelineItems.filter((i) => i.category === 'Education').length,
    },
    {
      label: 'Milestone',
      count: timelineItems.filter((i) => i.category === 'Milestone').length,
    },
  ]

  const filteredItems =
    activeFilter === 'All'
      ? timelineItems
      : timelineItems.filter((item) => item.category === activeFilter)

  return (
    <section
      id="about"
      className="mx-auto max-w-6xl scroll-mt-24 px-4 py-16 sm:px-6 md:py-24 relative"
    >
      <div id="experience" className="absolute -top-24" />
      {/* Header section */}
      <div className="flex items-center justify-between">
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-muted-foreground/80">
          EXPERIENCE
        </p>
        <span className="text-xs text-muted-foreground/60">
          Selected milestones
        </span>
      </div>

      {/* Tabs Filter Bar */}
      <div className="mt-5 flex flex-wrap items-center gap-2 sm:gap-2.5">
        {categories.map((cat) => {
          const isActive = activeFilter === cat.label
          return (
            <button
              key={cat.label}
              type="button"
              onClick={() => setActiveFilter(cat.label)}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200',
                isActive
                  ? 'bg-foreground text-background shadow-sm'
                  : 'bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-foreground border border-white/10',
              )}
            >
              <span>{cat.label}</span>
              <span
                className={cn(
                  'rounded px-1.5 py-0.5 text-[10px] font-mono leading-none',
                  isActive
                    ? 'bg-background/20 text-background'
                    : 'bg-white/10 text-muted-foreground',
                )}
              >
                {cat.count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Timeline List */}
      <div className="relative mt-12 space-y-6 pl-8 sm:pl-10">
        {/* Continuous background vertical line */}
        <div className="absolute left-2 top-2 bottom-2 w-px bg-border" />

        {filteredItems.map((item, i) => (
          <Reveal key={item.id} delay={i * 60}>
            <div className="group relative rounded-xl p-4 sm:p-5 transition-all duration-300 hover:bg-card/60 border border-transparent hover:border-border hover:shadow-[0_4px_24px_rgba(60,45,30,0.08)] dark:hover:shadow-[0_4px_24px_rgba(255,255,255,0.06)]">
              {/* Glowing vertical line segment on hover */}
              <div className="absolute -left-[24px] sm:-left-[32px] top-0 bottom-0 w-[2px] -translate-x-1/2 bg-foreground opacity-0 group-hover:opacity-100 shadow-[0_0_10px_rgba(60,45,30,0.3)] dark:shadow-[0_0_12px_rgba(255,255,255,0.8)] transition-all duration-300" />

              {/* Glowing node dot on hover */}
              <span
                className="absolute -left-[24px] sm:-left-[32px] top-6 h-3 w-3 -translate-x-1/2 rounded-full border border-muted-foreground/40 bg-background transition-all duration-300 group-hover:border-foreground group-hover:bg-foreground group-hover:scale-125 group-hover:shadow-[0_0_12px_rgba(60,45,30,0.4)] dark:group-hover:border-white dark:group-hover:bg-white dark:group-hover:shadow-[0_0_14px_rgba(255,255,255,0.9)]"
                aria-hidden="true"
              />

              {/* Title & Year */}
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <h3 className="text-base font-bold text-foreground sm:text-lg transition-all duration-300 group-hover:text-foreground group-hover:drop-shadow-[0_0_8px_rgba(60,45,30,0.35)] dark:group-hover:text-white dark:group-hover:drop-shadow-[0_0_12px_rgba(255,255,255,0.7)]">
                  {item.title}
                </h3>
                <span className="font-mono text-xs text-muted-foreground sm:text-sm transition-colors duration-300 group-hover:text-foreground/70">
                  {item.period}
                </span>
              </div>

              {/* Subtitle: Organization + Tag */}
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                <span className="font-medium text-muted-foreground transition-colors duration-300 group-hover:text-foreground/80">
                  {item.organization}
                </span>
                <span className="text-muted-foreground/40">•</span>
                <span className="rounded border border-border bg-card px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground transition-all duration-300 group-hover:border-foreground/30 group-hover:text-foreground">
                  {item.category}
                </span>
              </div>

              {/* Description */}
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground/80 sm:text-sm transition-colors duration-300 group-hover:text-foreground/90/95">
                {item.description}
              </p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  )
}

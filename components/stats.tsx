import { Reveal } from '@/components/reveal'
import { stats } from '@/lib/portfolio-data'

export function Stats() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <Reveal>
        <dl className="glass grid grid-cols-2 gap-px overflow-hidden rounded-2xl md:grid-cols-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="flex flex-col items-center gap-1 px-4 py-6 text-center"
            >
              <dt className="sr-only">{stat.label}</dt>
              <dd className="font-mono text-2xl font-semibold text-foreground sm:text-3xl">
                {stat.value}
              </dd>
              <p className="text-xs leading-snug text-muted-foreground sm:text-sm">
                {stat.label}
              </p>
            </div>
          ))}
        </dl>
      </Reveal>
    </section>
  )
}

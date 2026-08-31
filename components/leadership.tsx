import { Users } from 'lucide-react'
import { SectionHeading } from '@/components/section-heading'
import { Reveal } from '@/components/reveal'
import { leadership } from '@/lib/portfolio-data'

export function Leadership() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24">
      <SectionHeading
        eyebrow="Academic"
        title="Leadership & Academic Experience"
        description="Leadership, collaboration, and technical responsibility earned through academic programming projects."
      />

      <div className="mt-10 grid gap-5 md:grid-cols-2">
        {leadership.map((item, i) => (
          <Reveal key={item.title} delay={i * 80}>
            <div className="glass h-full rounded-2xl p-6">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-brand/15 text-accent-brand">
                  <Users size={18} />
                </span>
                <h3 className="text-base font-medium text-foreground">
                  {item.title}
                </h3>
              </div>
              <ul className="mt-5 space-y-3">
                {item.points.map((point) => (
                  <li
                    key={point}
                    className="flex items-start gap-2.5 text-sm leading-relaxed text-muted-foreground"
                  >
                    <span
                      className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-accent-brand"
                      aria-hidden="true"
                    />
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  )
}

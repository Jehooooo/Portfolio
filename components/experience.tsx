import { Check } from 'lucide-react'
import { SectionHeading } from '@/components/section-heading'
import { Reveal } from '@/components/reveal'
import { experience } from '@/lib/portfolio-data'

export function Experience() {
  return (
    <section
      id="experience"
      className="mx-auto max-w-6xl scroll-mt-24 px-4 py-16 sm:px-6 md:py-24"
    >
      <SectionHeading eyebrow="Experience" title="Experience" />

      <div className="mt-10 space-y-6">
        {experience.map((job, i) => (
          <Reveal key={job.title} delay={i * 80}>
            <div className="glass rounded-2xl p-6 md:p-8">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-lg font-medium text-foreground">
                    {job.title}
                    <span className="text-muted-foreground"> — {job.company}</span>
                  </h3>
                </div>
                <span className="font-mono text-xs text-muted-foreground">
                  {job.period}
                </span>
              </div>

              <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                {job.points.map((point) => (
                  <li
                    key={point}
                    className="flex items-start gap-2.5 text-sm leading-relaxed text-muted-foreground"
                  >
                    <span className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-accent-brand/15 text-accent-brand">
                      <Check size={11} />
                    </span>
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

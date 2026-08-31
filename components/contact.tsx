import { FileText, Mail, Phone } from 'lucide-react'
import { Reveal } from '@/components/reveal'
import { profile } from '@/lib/portfolio-data'

export function Contact() {

  return (
    <section
      id="contact"
      className="mx-auto max-w-6xl scroll-mt-24 px-4 py-16 sm:px-6 md:py-24"
    >
      <Reveal>
        <div className="glass-strong relative overflow-hidden rounded-3xl px-6 py-14 text-center sm:px-12 md:py-20">
          <h2 className="mx-auto max-w-2xl text-balance text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl">
            Contact Me
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-pretty leading-relaxed text-muted-foreground">
            I&apos;m open to internships, opportunities, collaborations, and projects where I
            can continue growing as a developer and contribute to meaningful work.
          </p>


          {/* Quick contact details grid */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm sm:text-base text-foreground/80/90">
            <a
              href={`mailto:${profile.email}`}
              className="flex items-center gap-2 transition-colors hover:text-foreground/70"
            >
              <Mail size={18} className="text-foreground/60" />
              <span>{profile.email}</span>
            </a>
            {profile.phone && (
              <a
                href={`tel:${profile.phone}`}
                className="flex items-center gap-2 transition-colors hover:text-foreground/70"
              >
                <Phone size={18} className="text-foreground/60" />
                <span>{profile.phone}</span>
              </a>
            )}
          </div>

          {/* Actions */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <a
              href={`mailto:${profile.email}`}
              className="btn-bw-primary inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-medium text-white transition-transform duration-200 hover:-translate-y-0.5"
            >
              <Mail size={16} />
              Email Me
            </a>
            {profile.resumeUrl && (
              <a
                href={profile.resumeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-white/12 bg-white/6 px-5 py-3 text-sm font-medium text-foreground/90 transition-all duration-200 hover:border-white/25 hover:bg-white/8"
              >
                <FileText size={16} />
                View Resume
              </a>
            )}
          </div>
        </div>
      </Reveal>
    </section>
  )
}

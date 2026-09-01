'use client'

import Image from 'next/image'
import { ArrowUpRight, FileText, Mail } from 'lucide-react'
import { GithubIcon, LinkedinIcon, InstagramIcon } from '@/components/brand-icons'
import { Reveal } from '@/components/reveal'
import { Typewriter } from '@/components/typewriter'
import { profile } from '@/lib/portfolio-data'
import { smoothScrollTo } from '@/lib/smooth-scroll'
import { GitHubHeatmap } from '@/components/github-heatmap'
import { BatSwarm } from '@/components/bat-swarm'

export function Hero() {
  const nameTitles = ['Jeho', 'CS Student']

  const socials = [
    {
      label: 'GitHub',
      url: profile.githubUrl,
      icon: GithubIcon,
      hoverStyle:
        'hover:border-white/40 hover:bg-white/10 hover:text-white hover:shadow-[0_0_20px_rgba(255,255,255,0.4)]',
    },
    {
      label: 'LinkedIn',
      url: profile.linkedinUrl,
      icon: LinkedinIcon,
      hoverStyle:
        'hover:border-[#0A66C2]/60 hover:bg-[#0A66C2]/20 hover:text-[#0A66C2] hover:shadow-[0_0_20px_rgba(10,102,194,0.5)]',
    },
    {
      label: 'Instagram',
      url: profile.instagramUrl,
      icon: InstagramIcon,
      hoverStyle:
        'hover:border-[#E1306C]/60 hover:bg-[#E1306C]/20 hover:text-[#E1306C] hover:shadow-[0_0_20px_rgba(225,48,108,0.5)]',
    },
    {
      label: 'Email',
      url: profile.email ? `mailto:${profile.email}` : '',
      icon: Mail,
      hoverStyle:
        'hover:border-white/25 hover:bg-white/8 hover:text-foreground/80 hover:shadow-[0_0_20px_rgba(168,85,247,0.5)]',
    },
  ].filter((s) => s.url)

  return (
    <section
      id="home"
      className="relative mx-auto flex min-h-svh max-w-6xl flex-col items-center justify-center gap-8 px-4 py-16 sm:px-6 sm:py-20 md:py-24 lg:flex-row lg:items-center lg:justify-between lg:gap-14"
    >
      {/* Visual / Profile Picture Column with Batman Bat Swarm Easter Egg */}
      <Reveal delay={100} className="flex w-full justify-center lg:order-2 lg:flex-1 shrink-0">
        <BatSwarm>
          <div className="profile-border-glow group cursor-pointer rounded-full">
            <div className="relative h-36 w-36 overflow-hidden rounded-full sm:h-48 sm:w-48 md:h-56 md:w-56 lg:h-60 lg:w-60">
              <Image
                src={profile.avatarUrl || '/images/profile.png'}
                alt={profile.name}
                fill
                sizes="(max-width: 640px) 176px, (max-width: 768px) 208px, 240px"
                priority
                className="object-cover object-center transition-transform duration-500 group-hover:scale-105"
              />
            </div>
          </div>
        </BatSwarm>
      </Reveal>

      {/* Copy / Main Hero Content */}
      <div className="flex w-full min-w-0 max-w-full flex-1 flex-col items-center text-center lg:order-1 lg:items-start lg:text-left">
        <Reveal delay={250}>
          <h1 className="mt-4 font-bold tracking-tight text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl leading-tight whitespace-nowrap flex items-center justify-center lg:justify-start gap-1.5 sm:gap-2">
            <span>Hi, I&apos;m&nbsp;</span>
            <span className="text-gradient inline">
              <Typewriter
                words={nameTitles}
                typingSpeed={85}
                deletingSpeed={45}
                delayAfterType={2000}
                loop={true}
              />
            </span>
          </h1>
        </Reveal>

        <Reveal delay={350}>
          <p className="mt-4 max-w-xl text-balance text-sm sm:text-base lg:text-lg leading-relaxed text-muted-foreground font-normal">
            I am Jeho, a 3rd BSCS Student from DMMMSU-SLUC passionate about AI and Web Development. I am a quick learner and a team player who is always looking for new challenges to grow and improve.
          </p>
        </Reveal>

        <Reveal delay={450} className="w-full">
          <div className="mt-6 flex flex-row flex-nowrap items-center justify-center lg:justify-start gap-1.5 sm:gap-2.5 md:gap-3 w-full">
            <a
              href={profile.resumeUrl || '/documents/JehoUpdatedResume.pdf'}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-bw-primary group inline-flex items-center justify-center gap-1 sm:gap-2 rounded-xl px-2.5 py-2 sm:px-4 sm:py-2.5 md:px-5 md:py-3 text-[11px] sm:text-xs md:text-sm font-semibold text-white shadow-md whitespace-nowrap shrink-0"
            >
              <FileText
                size={14}
                className="shrink-0 transition-transform duration-300 group-hover:-translate-y-0.5 sm:w-4 sm:h-4"
              />
              <span>View Resume</span>
            </a>

            <a
              href="#projects"
              onClick={smoothScrollTo}
              className="btn-bw-secondary group inline-flex items-center justify-center gap-1 sm:gap-2 rounded-xl px-2.5 py-2 sm:px-4 sm:py-2.5 md:px-5 md:py-3 text-[11px] sm:text-xs md:text-sm font-medium text-foreground whitespace-nowrap shrink-0"
            >
              <span>View My Projects</span>
              <ArrowUpRight
                size={14}
                className="shrink-0 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 sm:w-4 sm:h-4"
              />
            </a>

            <a
              href="#contact"
              onClick={smoothScrollTo}
              className="btn-bw-secondary group inline-flex items-center justify-center gap-1 sm:gap-2 rounded-xl px-2.5 py-2 sm:px-4 sm:py-2.5 md:px-5 md:py-3 text-[11px] sm:text-xs md:text-sm font-medium text-foreground whitespace-nowrap shrink-0"
            >
              <Mail
                size={14}
                className="shrink-0 text-primary transition-colors duration-300 group-hover:text-foreground sm:w-4 sm:h-4"
              />
              <span>Contact Me</span>
            </a>
          </div>
        </Reveal>

        {/* Social Links on the First Page (Hero) */}
        {socials.length > 0 && (
          <Reveal delay={550}>
            <div className="mt-8 flex items-center justify-center gap-3 lg:justify-start">
              <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground mr-1">
                Socials:
              </span>
              {socials.map((social) => (
                <a
                  key={social.label}
                  href={social.url}
                  target={social.label === 'Email' ? undefined : '_blank'}
                  rel={social.label === 'Email' ? undefined : 'noreferrer'}
                  aria-label={social.label}
                  title={social.label}
                  className={`group flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground backdrop-blur-md transition-all duration-300 hover:scale-110 hover:-translate-y-1 ${social.hoverStyle}`}
                >
                  <social.icon
                    size={20}
                    className="transition-transform duration-300 group-hover:scale-110"
                  />
                </a>
              ))}
            </div>
          </Reveal>
        )}
        <Reveal delay={650} className="mt-6 w-full max-w-full overflow-hidden">
          <GitHubHeatmap username="Jehooooo" />
        </Reveal>
      </div>
    </section>
  )
}

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
  const nameTitles = ["Jeho"]

  const socials = [
    {
      label: 'GitHub',
      url: profile.githubUrl,
      icon: GithubIcon,
      hoverStyle:
        'hover:border-foreground/40 hover:bg-foreground/10 hover:text-foreground hover:shadow-[0_0_20px_rgba(255,255,255,0.4)]',
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
        'hover:border-foreground/40 hover:bg-foreground/10 hover:text-foreground hover:shadow-[0_0_20px_rgba(255,255,255,0.4)]',
    },
  ].filter((s) => s.url)

  return (
    <section
      id="home"
      className="relative mx-auto flex min-h-svh max-w-6xl flex-col justify-center px-4 py-16 sm:px-6 sm:py-20 md:py-24"
    >
      {/* Upper Grid: Left (Copy/Actions) & Right (Profile Picture adjusted to the right) */}
      <div className="flex flex-col items-center justify-between gap-8 lg:flex-row lg:items-center lg:gap-12">
        {/* Copy / Main Hero Content */}
        <div className="flex w-full min-w-0 max-w-full flex-1 flex-col items-center text-center lg:items-start lg:text-left">
          <Reveal delay={250}>
            <h1 className="mt-2 font-bold tracking-tight text-2xl sm:text-3xl md:text-4xl lg:text-5xl leading-tight whitespace-nowrap flex items-center justify-center lg:justify-start gap-1.5 sm:gap-2">
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
              I am Jeho, a 3rd year BSCS Student from DMMMSU-SLUC passionate about AI and Web Development. I am a quick learner and a team player who is always looking for new challenges to grow and improve.
            </p>
          </Reveal>

          <Reveal delay={450} className="w-full">
            <div className="mt-6 flex flex-row flex-nowrap items-center justify-center lg:justify-start gap-1.5 sm:gap-2.5 md:gap-3 w-full">
              <a
                href={profile.resumeUrl || '/documents/Jeho-Update-Resume.pdf'}
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

          {/* Social Links */}
          {socials.length > 0 && (
            <Reveal delay={550}>
              <div className="mt-6 flex items-center justify-center gap-3 lg:justify-start">
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
                    className={`group flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground backdrop-blur-md transition-all duration-300 hover:scale-110 hover:-translate-y-1 ${social.hoverStyle}`}
                  >
                    <social.icon
                      size={19}
                      className="transition-transform duration-300 group-hover:scale-110"
                    />
                  </a>
                ))}
              </div>
            </Reveal>
          )}
        </div>

        {/* Visual / Profile Picture Column shifted slightly to the right */}
        <Reveal delay={100} className="flex w-full justify-center lg:w-auto lg:justify-end lg:pr-2 lg:translate-x-6 shrink-0">
          <BatSwarm>
            <div className="profile-border-glow group cursor-pointer rounded-full">
              <div className="relative h-40 w-40 overflow-hidden rounded-full sm:h-52 sm:w-52 md:h-60 md:w-60 lg:h-64 lg:w-64">
                <Image
                  src={profile.avatarUrl || '/images/profile.png'}
                  alt={profile.name}
                  fill
                  sizes="(max-width: 640px) 192px, (max-width: 768px) 240px, 260px"
                  priority
                  className="object-cover object-center transition-transform duration-500 group-hover:scale-105"
                />
              </div>
            </div>
          </BatSwarm>
        </Reveal>
      </div>

      {/* GitHub Heatmap - Spanning the hero with larger size and zero wasted spaces */}
      <Reveal delay={650} className="mt-8 sm:mt-10 w-full max-w-full overflow-hidden">
        <GitHubHeatmap username="Jehooooo" />
      </Reveal>
    </section>
  )
}
import { Reveal } from '@/components/reveal'

const row1Skills = [
  {
    name: 'HTML5',
    iconUrl: 'https://cdn.simpleicons.org/html5/E34F26',
  },
  {
    name: 'CSS3',
    iconUrl: '/icons/css3.svg',
  },
  {
    name: 'JavaScript',
    iconUrl: 'https://cdn.simpleicons.org/javascript/F7DF1E',
  },
  {
    name: 'React',
    iconUrl: 'https://cdn.simpleicons.org/react/61DAFB',
  },
  {
    name: 'Python',
    iconUrl: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/python/python-original.svg',
  },
  {
    name: 'Java',
    iconUrl: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/java/java-original.svg',
  },
  {
    name: 'Django',
    iconUrl: 'https://cdn.simpleicons.org/django/white',
  },
  {
    name: 'Flask',
    iconUrl: 'https://cdn.simpleicons.org/flask/white',
  },
]

const row2Skills = [
  {
    name: 'MongoDB',
    iconUrl: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/mongodb/mongodb-original.svg',
  },
  {
    name: 'MySQL',
    iconUrl: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/mysql/mysql-original.svg',
  },
  {
    name: 'Git',
    iconUrl: 'https://cdn.simpleicons.org/git/F05032',
  },
  {
    name: 'GitHub',
    iconUrl: 'https://cdn.simpleicons.org/github/white',
  },
  {
    name: 'Vercel',
    iconUrl: 'https://cdn.simpleicons.org/vercel/white',
  },
  {
    name: 'Photoshop',
    iconUrl: '/icons/photoshop.svg',
  },
  {
    name: 'Premiere Pro',
    iconUrl: '/icons/premierepro.svg',
  },
]

// Duplicate each row for continuous 100% infinite marquee loop
const marqueeRow1 = [...row1Skills, ...row1Skills]
const marqueeRow2 = [...row2Skills, ...row2Skills]

export function Skills() {
  return (
    <section
      id="skills"
      className="mx-auto max-w-6xl scroll-mt-24 px-4 py-16 sm:px-6 md:py-24"
    >
      <style>{`
        @keyframes marqueeLeftDirect {
          0% { transform: translate3d(0%, 0, 0); }
          100% { transform: translate3d(-50%, 0, 0); }
        }
        .marquee-track-left {
          display: flex !important;
          width: max-content !important;
          animation: marqueeLeftDirect 20s linear infinite !important;
          will-change: transform;
        }
        .marquee-track-left:hover {
          animation-play-state: paused !important;
        }

        @keyframes marqueeRightDirect {
          0% { transform: translate3d(-50%, 0, 0); }
          100% { transform: translate3d(0%, 0, 0); }
        }
        .marquee-track-right {
          display: flex !important;
          width: max-content !important;
          animation: marqueeRightDirect 20s linear infinite !important;
          will-change: transform;
        }
        .marquee-track-right:hover {
          animation-play-state: paused !important;
        }
      `}</style>

      {/* Header section matching mockup */}
      <div className="flex items-center justify-between">
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-muted-foreground/80">
          TECH STACK
        </p>
        <a
          href="#projects"
          className="font-mono text-xs text-muted-foreground/60 transition-colors hover:text-foreground"
        >
          View All &rarr;
        </a>
      </div>

      {/* Two-Row Marquee Stack matching screenshot */}
      <Reveal delay={100} className="mt-8 space-y-4 overflow-hidden">
        {/* Upper Row (Moving right to left) */}
        <div className="relative w-full overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_5%,black_95%,transparent)]">
          <div className="marquee-track-left flex flex-nowrap w-max items-center py-2">
            {marqueeRow1.map((skill, index) => (
              <div
                key={`row1-${skill.name}-${index}`}
                title={skill.name}
                className="group relative mx-2 flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-[#0d0818] shadow-md transition-all duration-300 hover:scale-110 hover:-translate-y-1 hover:border-purple-400/50 hover:bg-purple-950/40 hover:shadow-[0_0_20px_rgba(168,85,247,0.3)] sm:h-20 sm:w-20"
              >
                <img
                  src={skill.iconUrl}
                  alt={skill.name}
                  width={36}
                  height={36}
                  className="h-8 w-8 object-contain transition-transform duration-300 group-hover:scale-110 sm:h-10 sm:w-10"
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Lower Row (Moving left to right) */}
        <div className="relative w-full overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_5%,black_95%,transparent)]">
          <div className="marquee-track-right flex flex-nowrap w-max items-center py-2">
            {marqueeRow2.map((skill, index) => (
              <div
                key={`row2-${skill.name}-${index}`}
                title={skill.name}
                className="group relative mx-2 flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-[#0d0818] shadow-md transition-all duration-300 hover:scale-110 hover:-translate-y-1 hover:border-purple-400/50 hover:bg-purple-950/40 hover:shadow-[0_0_20px_rgba(168,85,247,0.3)] sm:h-20 sm:w-20"
              >
                <img
                  src={skill.iconUrl}
                  alt={skill.name}
                  width={36}
                  height={36}
                  className="h-8 w-8 object-contain transition-transform duration-300 group-hover:scale-110 sm:h-10 sm:w-10"
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        </div>
      </Reveal>
    </section>
  )
}

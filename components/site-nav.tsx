'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { navLinks, profile } from '@/lib/portfolio-data'
import { smoothScrollTo } from '@/lib/smooth-scroll'
import { ThemeToggle } from '@/components/theme-toggle'

const SECTION_IDS = navLinks.map((l) => l.href.slice(1))

export function SiteNav() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const [activeSection, setActiveSection] = useState('home')
  const isClickNavigatingRef = useRef(false)
  const clickNavTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Determine active section based on current scroll position and section bounds
  const updateActiveSection = useCallback(() => {
    if (isClickNavigatingRef.current) return
    if (typeof window === 'undefined') return

    const scrollY = window.scrollY
    const windowHeight = window.innerHeight
    const documentHeight = document.documentElement.scrollHeight

    // Scrolled header background styling
    setScrolled(scrollY > 12)

    // 1. Edge Case: Top of page
    if (scrollY < 80) {
      setActiveSection('home')
      return
    }

    // 2. Edge Case: Bottom of page (ensures Contact highlights when scrolled all the way down)
    if (windowHeight + scrollY >= documentHeight - 60) {
      setActiveSection('contact')
      return
    }

    // 3. Focal zone detection:
    // Sections have varying heights (Skills is ~450px, Projects is ~1000px, About is ~1000px).
    // The reading focal line is at ~35% of the viewport height (just below fixed header).
    const focalY = windowHeight * 0.35

    for (const id of SECTION_IDS) {
      const el = document.getElementById(id)
      if (!el) continue
      const rect = el.getBoundingClientRect()
      if (rect.top <= focalY && rect.bottom > focalY) {
        setActiveSection(id)
        return
      }
    }

    // 4. Fallback: whichever section has the greatest visible area in the viewport
    let maxVisibleHeight = 0
    let mostVisibleSection = 'home'

    for (const id of SECTION_IDS) {
      const el = document.getElementById(id)
      if (!el) continue
      const rect = el.getBoundingClientRect()
      const visibleTop = Math.max(0, rect.top)
      const visibleBottom = Math.min(windowHeight, rect.bottom)
      const visibleHeight = Math.max(0, visibleBottom - visibleTop)

      if (visibleHeight > maxVisibleHeight) {
        maxVisibleHeight = visibleHeight
        mostVisibleSection = id
      }
    }

    if (maxVisibleHeight > 0) {
      setActiveSection(mostVisibleSection)
    }
  }, [])

  // Setup IntersectionObserver + Scroll Listener for high accuracy
  useEffect(() => {
    // Initial check on mount
    updateActiveSection()

    // Sync from URL hash if initial load had a valid hash (e.g. #projects)
    if (typeof window !== 'undefined' && window.location.hash) {
      const hashId = window.location.hash.slice(1)
      if (SECTION_IDS.includes(hashId)) {
        setActiveSection(hashId)
      }
    }

    // IntersectionObserver to observe sections entering/leaving viewport
    let observer: IntersectionObserver | null = null
    if (typeof IntersectionObserver !== 'undefined') {
      observer = new IntersectionObserver(
        () => {
          if (!isClickNavigatingRef.current) {
            updateActiveSection()
          }
        },
        {
          root: null,
          rootMargin: '-10% 0px -40% 0px',
          threshold: [0, 0.25, 0.5, 0.75, 1],
        }
      )

      SECTION_IDS.forEach((id) => {
        const el = document.getElementById(id)
        if (el) observer?.observe(el)
      })
    }

    // Throttled scroll listener via requestAnimationFrame
    let rafId: number | null = null
    const handleScroll = () => {
      if (rafId !== null) return
      rafId = window.requestAnimationFrame(() => {
        updateActiveSection()
        rafId = null
      })
    }

    // Listen to hashchange events to keep active state synchronized
    const handleHashChange = () => {
      const hashId = window.location.hash.slice(1)
      if (SECTION_IDS.includes(hashId)) {
        setActiveSection(hashId)
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('resize', handleScroll, { passive: true })
    window.addEventListener('hashchange', handleHashChange)

    return () => {
      if (observer) observer.disconnect()
      if (rafId !== null) window.cancelAnimationFrame(rafId)
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleScroll)
      window.removeEventListener('hashchange', handleHashChange)
      if (clickNavTimeoutRef.current) clearTimeout(clickNavTimeoutRef.current)
    }
  }, [updateActiveSection])

  // Prevent background scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  // Handle link click: immediate highlight update + smooth scroll + hash sync
  const handleNavClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    sectionId: string
  ) => {
    // 1. Immediately highlight the clicked section
    setActiveSection(sectionId)

    // 2. Suppress automatic scroll spy override during smooth scroll animation
    isClickNavigatingRef.current = true
    if (clickNavTimeoutRef.current) clearTimeout(clickNavTimeoutRef.current)
    clickNavTimeoutRef.current = setTimeout(() => {
      isClickNavigatingRef.current = false
      updateActiveSection()
    }, 850)

    // 3. Keep URL hash synchronized without causing abrupt browser jump
    if (typeof window !== 'undefined' && window.history?.replaceState) {
      window.history.replaceState(null, '', `#${sectionId}`)
    }

    // 4. Close mobile menu if open
    setOpen(false)

    // 5. Execute smooth animated scroll
    smoothScrollTo(e)
  }

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-4 pt-3 sm:px-6 sm:pt-4">
      <nav
        aria-label="Primary"
        className={cn(
          'mx-auto flex max-w-6xl items-center justify-between rounded-2xl px-4 py-2.5 sm:py-3 transition-all duration-300 sm:px-5',
          scrolled ? 'glass-strong shadow-lg shadow-black/20' : 'glass',
        )}
      >
        <a
          href="#home"
          onClick={(e) => handleNavClick(e, 'home')}
          className="font-mono text-sm font-semibold tracking-tight text-foreground transition-opacity hover:opacity-80 truncate max-w-[140px] sm:max-w-none"
        >
          {profile.name}
        </a>

        <ul className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => {
            const sectionId = link.href.slice(1)
            const isActive = activeSection === sectionId

            return (
              <li key={link.href}>
                <a
                  href={link.href}
                  onClick={(e) => handleNavClick(e, sectionId)}
                  className={cn(
                    'rounded-lg px-3.5 py-2 text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-foreground/10 text-foreground font-semibold shadow-xs'
                      : 'text-muted-foreground hover:bg-foreground/5 hover:text-foreground',
                  )}
                >
                  {link.label}
                </a>
              </li>
            )
          })}
        </ul>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <a
            href="#contact"
            onClick={(e) => handleNavClick(e, 'contact')}
            className="hidden btn-bw-primary rounded-xl px-4 py-2 text-xs font-semibold text-white transition-transform duration-200 hover:-translate-y-0.5 sm:inline-block"
          >
            Let&apos;s Work Together
          </a>
          <button
            type="button"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent md:hidden"
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      <div
        className={cn(
          'md:hidden',
          open ? 'pointer-events-auto' : 'pointer-events-none',
        )}
      >
        <div
          className={cn(
            'mx-auto mt-2 max-w-6xl origin-top overflow-hidden rounded-2xl transition-all duration-300',
            open
              ? 'glass-strong max-h-[26rem] opacity-100 shadow-lg shadow-black/20'
              : 'max-h-0 opacity-0',
          )}
        >
          <ul className="flex flex-col gap-1 p-3">
            {navLinks.map((link) => {
              const sectionId = link.href.slice(1)
              const isActive = activeSection === sectionId

              return (
                <li key={link.href}>
                  <a
                    href={link.href}
                    onClick={(e) => handleNavClick(e, sectionId)}
                    className={cn(
                      'block rounded-lg px-4 py-3 text-base transition-colors',
                      isActive
                        ? 'bg-foreground/10 text-foreground font-semibold'
                        : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                    )}
                  >
                    {link.label}
                  </a>
                </li>
              )
            })}
            <li>
              <a
                href="#contact"
                onClick={(e) => handleNavClick(e, 'contact')}
                className="mt-1 block rounded-xl btn-bw-primary px-4 py-3 text-center text-base font-semibold text-white"
              >
                Let&apos;s Work Together
              </a>
            </li>
          </ul>
        </div>
      </div>
    </header>
  )
}
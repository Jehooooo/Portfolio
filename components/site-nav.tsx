'use client'

import { useEffect, useState } from 'react'
import { Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { navLinks, profile } from '@/lib/portfolio-data'
import { smoothScrollTo } from '@/lib/smooth-scroll'
import { ThemeToggle } from '@/components/theme-toggle'

export function SiteNav() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-4 pt-3 sm:px-6 sm:pt-4">
      <nav
        aria-label="Primary"
        className={cn(
          'mx-auto flex max-w-6xl items-center justify-between rounded-2xl px-4 py-3 transition-all duration-300 sm:px-5',
          scrolled ? 'glass-strong shadow-lg shadow-black/20' : 'glass',
        )}
      >
        <a
          href="#home"
          onClick={smoothScrollTo}
          className="font-mono text-sm font-semibold tracking-tight text-foreground transition-opacity hover:opacity-80"
        >
          {profile.name}
        </a>

        <ul className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                onClick={smoothScrollTo}
                className="rounded-lg px-3.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <a
            href="#contact"
            onClick={smoothScrollTo}
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
            {navLinks.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  onClick={(e) => {
                    setOpen(false)
                    smoothScrollTo(e)
                  }}
                  className="block rounded-lg px-4 py-3 text-base text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  {link.label}
                </a>
              </li>
            ))}
            <li>
              <a
                href="#contact"
                onClick={(e) => {
                  setOpen(false)
                  smoothScrollTo(e)
                }}
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

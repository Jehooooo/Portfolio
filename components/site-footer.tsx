'use client'

import { navLinks, profile } from '@/lib/portfolio-data'
import { smoothScrollTo } from '@/lib/smooth-scroll'

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-card/30 backdrop-blur-xs">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-center md:justify-between">
        <div>
          <a
            href="#home"
            onClick={smoothScrollTo}
            className="font-mono text-sm font-semibold text-foreground transition-opacity hover:opacity-80 cursor-pointer"
          >
            {profile.name}
          </a>
        </div>

        <nav aria-label="Footer">
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            {navLinks.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  onClick={smoothScrollTo}
                  className="text-sm text-muted-foreground transition-all duration-200 hover:text-foreground hover:-translate-y-0.5 inline-block cursor-pointer"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  )
}
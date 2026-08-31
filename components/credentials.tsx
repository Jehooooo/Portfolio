'use client'

import { useState, useEffect } from 'react'
import { Award, ExternalLink, Download, X, Eye } from 'lucide-react'
import { SectionHeading } from '@/components/section-heading'
import { Reveal } from '@/components/reveal'
import { certifications, softSkills, type Certificate } from '@/lib/portfolio-data'

export function Credentials() {
  const [selectedCert, setSelectedCert] = useState<Certificate | null>(null)

  useEffect(() => {
    if (selectedCert) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [selectedCert])

  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24">
      <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
        {/* Certifications */}
        <div>
          <SectionHeading eyebrow="Credentials" title="Certifications" />
          <p className="mt-2 text-xs text-muted-foreground">
            Click any certificate below to view full details and verification.
          </p>
          <div className="mt-8 space-y-4">
            {certifications.map((cert, i) => (
              <Reveal key={cert.id} delay={i * 80}>
                <button
                  type="button"
                  onClick={() => setSelectedCert(cert)}
                  className="glass group flex w-full items-center justify-between rounded-2xl p-5 text-left transition-all duration-300 hover:scale-[1.02] hover:border-purple-400/40 hover:bg-purple-950/30 hover:shadow-[0_0_25px_rgba(168,85,247,0.25)]"
                >
                  <div className="flex items-center gap-4">
                    <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-accent-brand/15 text-accent-brand transition-transform duration-300 group-hover:scale-110 group-hover:bg-purple-500/25">
                      <Award size={22} />
                    </span>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground transition-colors group-hover:text-white">
                        {cert.title}
                      </h3>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {cert.issuer}
                      </p>
                    </div>
                  </div>
                  <span className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 font-mono text-[11px] text-muted-foreground transition-all group-hover:border-purple-400/50 group-hover:bg-purple-500/20 group-hover:text-purple-200">
                    <Eye size={12} />
                    View
                  </span>
                </button>
              </Reveal>
            ))}
          </div>
        </div>

        {/* Soft skills */}
        <div>
          <SectionHeading eyebrow="Strengths" title="Soft Skills" />
          <Reveal delay={80}>
            <ul className="mt-8 flex flex-wrap gap-3">
              {softSkills.map((skill) => (
                <li
                  key={skill}
                  className="glass rounded-full px-4 py-2 text-sm text-foreground transition-all duration-300 hover:scale-105 hover:border-purple-500/40 hover:text-white"
                >
                  {skill}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </div>

      {/* Certificate Detail Modal */}
      {selectedCert && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md transition-opacity animate-in fade-in duration-200 sm:p-6"
          onClick={() => setSelectedCert(null)}
        >
          <div
            className="glass-strong relative flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-purple-500/30 shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/10 p-5 sm:px-6">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/20 text-purple-300">
                  <Award size={20} />
                </span>
                <div>
                  <h3 className="text-base font-bold text-white sm:text-lg">
                    {selectedCert.title}
                  </h3>
                  <p className="text-xs text-purple-200/80">
                    Issuer: {selectedCert.issuer}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCert(null)}
                className="rounded-xl border border-white/10 p-2 text-muted-foreground transition-colors hover:bg-white/10 hover:text-white"
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Content / Document Preview */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              {selectedCert.description && (
                <p className="text-xs sm:text-sm text-purple-100/90 leading-relaxed bg-purple-950/40 border border-purple-500/20 rounded-xl p-3.5">
                  {selectedCert.description}
                </p>
              )}

              <div className="relative flex min-h-[350px] sm:min-h-[480px] w-full items-center justify-center rounded-2xl border border-white/10 bg-black/50 p-2 overflow-hidden">
                {selectedCert.fileType === 'image' ? (
                  <img
                    src={selectedCert.fileUrl}
                    alt={selectedCert.title}
                    className="max-h-[60vh] w-auto max-w-full rounded-xl object-contain shadow-2xl"
                  />
                ) : (
                  <iframe
                    src={selectedCert.fileUrl}
                    className="h-[55vh] w-full rounded-xl border border-white/10 bg-white"
                    title={selectedCert.title}
                  />
                )}
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="flex flex-wrap items-center justify-end gap-3 border-t border-white/10 p-4 sm:px-6">
              <a
                href={selectedCert.fileUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-xs font-semibold text-purple-100 transition-all hover:bg-white/10 hover:text-white"
              >
                <ExternalLink size={14} />
                Open Full Document
              </a>
              <a
                href={selectedCert.fileUrl}
                download
                className="btn-purple-primary inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold text-white shadow-md"
              >
                <Download size={14} />
                Download Certificate
              </a>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

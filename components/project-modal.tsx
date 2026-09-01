'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import {
  X,
  ExternalLink,
  Layers,
  Sparkles,
  Shield,
  FileText,
  AlertCircle,
  Database,
  ArrowRight,
  Play,
} from 'lucide-react'
import { GithubIcon } from '@/components/brand-icons'
import type { Project, FeatureDetail } from '@/lib/portfolio-data'

interface ProjectModalProps {
  project: Project | null
  onClose: () => void
}

function youtubeId(url: string) {
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{11})/,
  )
  return match?.[1] ?? null
}

function vimeoId(url: string) {
  const match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/)
  return match?.[1] ?? null
}

export function ProjectModal({ project, onClose }: ProjectModalProps) {
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    setPlaying(false)
  }, [project])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (project) {
      document.body.style.overflow = 'hidden'
      window.addEventListener('keydown', handleKeyDown)
    }
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [project, onClose])

  if (!project) return null

  const yt = project.youtube ? youtubeId(project.youtube) : null
  const vm = project.vimeo ? vimeoId(project.vimeo) : null
  const mainVideo = project.video || project.bottomVideo

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
      />

      {/* Modal Dialog Content */}
      <div className="glass-strong relative z-10 my-auto w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl p-5 sm:p-8 shadow-2xl border border-border">
        {/* Sticky Header Close Button */}
        <div className="sticky top-0 z-20 -mx-5 -mt-5 mb-5 flex items-center justify-between border-b border-border/60 bg-background/95 px-5 py-3.5 backdrop-blur-md sm:-mx-8 sm:-mt-8 sm:mb-6 sm:px-8 sm:py-4">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <span className="rounded-full bg-card px-3 py-1 font-mono text-xs font-semibold text-foreground/80 border border-border">
              {project.status}
            </span>
            <span className="font-mono text-xs text-muted-foreground">
              {project.categories.join(' • ')}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Prominent Role Badge */}
        <div className="mb-3.5">
          <div className="inline-flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-1.5 font-mono text-xs shadow-xs">
            <span className="font-bold text-muted-foreground uppercase tracking-wider">ROLE:</span>
            <span className="font-semibold text-foreground">{project.role}</span>
          </div>
        </div>

        {/* Title & Subtitle */}
        <div className="mb-6">
          <h2 className="text-balance text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl text-foreground">
            {project.title}
          </h2>
          {project.subtitle && (
            <p className="mt-2 text-balance font-mono text-sm leading-relaxed text-muted-foreground sm:text-base">
              {project.subtitle}
            </p>
          )}
        </div>

        {/* Media Player Showcase */}
        <div className="relative mb-8 aspect-video w-full overflow-hidden rounded-2xl border border-border bg-black/40 shadow-inner">
          {mainVideo ? (
            playing ? (
              <video
                autoPlay
                controls
                preload="auto"
                className="h-full w-full object-cover"
              >
                <source src={mainVideo} type="video/mp4" />
                <source src="/videos/0809.mp4" type="video/mp4" />
                <source src="/videos/dmmmsu-incident-demo.mp4" type="video/mp4" />
                <source src="/dmmmsu-incident-demo.avi" type="video/x-msvideo" />
                Your browser does not support the video tag.
              </video>
            ) : (
              <button
                type="button"
                onClick={() => setPlaying(true)}
                aria-label={`Play ${project.title} video`}
                className="group relative h-full w-full block cursor-pointer"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={project.image || '/images/placeholder.svg'}
                  alt={project.title}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 transition-colors group-hover:bg-black/45">
                  <span className="flex h-16 w-16 items-center justify-center rounded-full btn-bw-primary text-white shadow-2xl transition-transform duration-200 group-hover:scale-110">
                    <Play size={26} className="ml-1 text-white" fill="currentColor" />
                  </span>
                </div>
              </button>
            )
          ) : yt || vm ? (
            playing ? (
              <iframe
                src={
                  yt
                    ? `https://www.youtube.com/embed/${yt}?autoplay=1`
                    : `https://player.vimeo.com/video/${vm}?autoplay=1`
                }
                title={`${project.title} video`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="h-full w-full"
              />
            ) : (
              <button
                type="button"
                onClick={() => setPlaying(true)}
                aria-label={`Play ${project.title} video`}
                className="group relative h-full w-full block cursor-pointer"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={project.image || (yt ? `https://i.ytimg.com/vi/${yt}/hqdefault.jpg` : '/images/placeholder.svg')}
                  alt={project.title}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 transition-colors group-hover:bg-black/45">
                  <span className="flex h-16 w-16 items-center justify-center rounded-full btn-bw-primary text-white shadow-2xl transition-transform duration-200 group-hover:scale-110">
                    <Play size={26} className="ml-1 text-white" fill="currentColor" />
                  </span>
                </div>
              </button>
            )
          ) : project.image ? (
            <div className="relative h-full w-full">
              <Image
                src={project.image}
                alt={project.title}
                fill
                className="object-cover"
              />
            </div>
          ) : null}
        </div>

        {/* Overview */}
        {project.overview && (
          <div className="mb-8 rounded-2xl border border-border bg-card/60 p-5 sm:p-6 backdrop-blur-md">
            <h3 className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-foreground/80 font-semibold mb-3">
              <FileText size={16} /> System Overview
            </h3>
            <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
              {project.overview}
            </p>
          </div>
        )}

        {/* Structured Incident Reporting Workflow Visual */}
        {project.workflow && project.workflow.length > 0 && (
          <div className="mb-8">
            <h3 className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-foreground/80 font-semibold mb-4">
              <AlertCircle size={16} /> 1. Structured Incident Reporting Workflow
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
              {project.workflow.map((item, idx) => (
                <div
                  key={`workflow-${item.step}-${idx}`}
                  className="relative flex flex-col rounded-2xl border border-border bg-card p-4 transition-all duration-200 hover:border-foreground/30"
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-foreground/10 font-mono text-xs font-bold text-foreground">
                      {idx + 1}
                    </span>
                    <span className="rounded-md border border-border bg-card/80 px-2 py-0.5 font-mono text-[10px] font-medium text-foreground/80">
                      {item.status}
                    </span>
                  </div>
                  <h4 className="font-semibold text-xs text-foreground mb-1">
                    {item.step}
                  </h4>
                  <p className="text-[11px] leading-relaxed text-muted-foreground">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Core System Architecture Breakdown */}
        {project.architecture && project.architecture.length > 0 && (
          <div className="mb-8">
            <h3 className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-foreground/80 font-semibold mb-4">
              <Layers size={16} /> 2. Core System Architecture Breakdown
            </h3>
            <div className="grid gap-4 md:grid-cols-3">
              {project.architecture.map((arch, idx) => (
                <div
                  key={`arch-${arch.layer}-${idx}`}
                  className="rounded-2xl border border-border bg-card p-5"
                >
                  <span className="font-mono text-xs font-bold uppercase tracking-wider text-foreground/70">
                    {arch.layer}
                  </span>
                  <ul className="mt-3 space-y-2">
                    {arch.items.map((it, itIdx) => (
                      <li
                        key={`arch-item-${idx}-${itIdx}`}
                        className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground"
                      >
                        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-foreground/60" />
                        <span>{it}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Database & ERD Relational Design */}
        {project.databaseSchema && project.databaseSchema.length > 0 && (
          <div className="mb-8">
            <h3 className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-foreground/80 font-semibold mb-4">
              <Database size={16} /> 3. Relational Database Design & Entities
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {project.databaseSchema.map((table, idx) => (
                <div
                  key={`table-${table.tableName}-${idx}`}
                  className="rounded-xl border border-border bg-card p-4 font-mono text-xs"
                >
                  <div className="flex items-center justify-between border-b border-border pb-2 mb-2 font-bold text-foreground">
                    <span>{table.tableName}</span>
                    <span className="text-[10px] text-muted-foreground font-normal">Table</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mb-3 leading-tight">
                    {table.description}
                  </p>
                  <div className="space-y-1 text-[11px]">
                    <div className="text-foreground/90 font-medium">Columns:</div>
                    <p className="text-muted-foreground leading-relaxed break-words">
                      {table.columns.join(', ')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Highlights / Technical Features */}
        {project.features && project.features.length > 0 && (
          <div className="mb-8">
            <h3 className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-foreground/80 font-semibold mb-4">
              <Sparkles size={16} /> 4. Key Functional Features & Automation
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {project.features.map((feat: string | FeatureDetail, idx: number) => {
                const isObj = typeof feat === 'object' && feat !== null
                const title = isObj ? (feat as FeatureDetail).title : String(feat)
                const key = `feature-${idx}-${title.slice(0, 20)}`

                return (
                  <div
                    key={key}
                    className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-foreground/30"
                  >
                    <ArrowRight size={16} className="mt-0.5 shrink-0 text-foreground/60" />
                    <div className="flex-1 text-xs leading-relaxed text-muted-foreground">
                      {isObj ? (
                        <>
                          <span className="font-semibold text-foreground text-sm block mb-1.5">
                            {(feat as FeatureDetail).title}
                          </span>
                          {(feat as FeatureDetail).details && (
                            <ul className="space-y-1.5 mt-1">
                              {(feat as FeatureDetail).details.map((d: string, dIdx: number) => (
                                <li key={`detail-${idx}-${dIdx}`} className="flex items-start gap-2 text-muted-foreground">
                                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-foreground/40" />
                                  <span>{d}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </>
                      ) : (
                        <span className="text-foreground/90 font-medium">{String(feat)}</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Security & Access Control */}
        {project.security && project.security.length > 0 && (
          <div className="mb-8 rounded-2xl border border-border bg-card p-5 sm:p-6">
            <h3 className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-foreground/80 font-semibold mb-4">
              <Shield size={16} /> 5. Security & Authentication Guardrails
            </h3>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {project.security.map((sec, idx) => (
                <div key={`sec-${idx}-${sec}`} className="flex items-center gap-2.5 text-xs text-muted-foreground">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-foreground/60" />
                  <span>{sec}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Detailed Tech Stack Categorized */}
        {project.detailedTech && project.detailedTech.length > 0 && (
          <div className="mb-8">
            <h3 className="font-mono text-xs uppercase tracking-wider text-foreground/80 font-semibold mb-4">
              Full Technology Stack Breakdown
            </h3>
            <div className="grid gap-2.5 sm:grid-cols-2 md:grid-cols-3">
              {project.detailedTech.map((t, idx) => (
                <div
                  key={`tech-${idx}-${t.category}-${t.tech}`}
                  className="flex items-center justify-between rounded-xl border border-border bg-card px-3.5 py-2.5 font-mono text-xs"
                >
                  <span className="text-muted-foreground">{t.category}</span>
                  <span className="font-semibold text-foreground">{t.tech}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Links Footer */}
        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-border/60 pt-6">
          <div className="flex flex-wrap gap-3">
            {project.liveUrl && (
              <a
                href={project.liveUrl}
                target="_blank"
                rel="noreferrer"
                className="btn-bw-primary inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold text-white shadow-md transition-transform duration-200 hover:-translate-y-0.5"
              >
                Live Demo <ExternalLink size={14} />
              </a>
            )}
            {project.githubUrl && (
              <a
                href={project.githubUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-xs font-medium text-foreground transition-all duration-200 hover:border-foreground/30 hover:bg-card"
              >
                <GithubIcon size={14} /> GitHub Repository
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
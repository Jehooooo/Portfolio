'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import {
  X,
  Play,
  CheckCircle2,
  AlertCircle,
  FileText,
  Bell,
  BarChart3,
  ShieldCheck,
  Cpu,
  ArrowRight,
  Download,
  ExternalLink,
} from 'lucide-react'
import { GithubIcon } from '@/components/brand-icons'
import type { Project } from '@/lib/portfolio-data'

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

interface ProjectModalProps {
  project: Project | null
  onClose: () => void
}

export function ProjectModal({ project, onClose }: ProjectModalProps) {
  const [playing, setPlaying] = useState(false)

  // Disable background scrolling when modal is open
  useEffect(() => {
    if (project) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [project])

  // ESC key listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  if (!project) return null

  const yt = project.youtube ? youtubeId(project.youtube) : null
  const vm = project.vimeo ? vimeoId(project.vimeo) : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-10">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity animate-in fade-in duration-300"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative z-10 max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-purple-500/25 bg-background/95 p-6 sm:p-8 shadow-2xl shadow-purple-950/50 backdrop-blur-2xl animate-in zoom-in-95 duration-300">
        {/* Sticky Header Close Button */}
        <div className="sticky top-0 z-20 -mx-6 -mt-6 mb-6 flex items-center justify-between border-b border-border/60 bg-background/80 px-6 py-4 backdrop-blur-md sm:-mx-8 sm:-mt-8 sm:px-8">
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-purple-500/15 px-3 py-1 font-mono text-xs font-semibold text-purple-400 border border-purple-500/20">
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
            className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-purple-500/20 hover:text-foreground"
          >
            <X size={22} />
          </button>
        </div>

        {/* Title & Subtitle */}
        <div className="mb-6">
          <h2 className="text-balance text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl text-foreground">
            {project.title}
          </h2>
          {project.subtitle && (
            <p className="mt-2 text-balance font-mono text-sm leading-relaxed text-purple-400">
              {project.subtitle}
            </p>
          )}
        </div>

        {/* Media Player Showcase */}
        <div className="relative mb-8 aspect-video w-full overflow-hidden rounded-2xl border border-purple-500/20 bg-black/40 shadow-inner">
          {project.video ? (
            <video
              controls
              preload="metadata"
              poster={project.image}
              className="h-full w-full object-cover"
            >
              <source src={project.video} type="video/mp4" />
              <source src="/dmmmsu-incident-demo.avi" type="video/x-msvideo" />
              Your browser does not support the video tag.
            </video>
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
                className="group relative h-full w-full"
              >
                {project.image ? (
                  <img
                    src={project.image}
                    alt={project.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-purple-950/20" />
                )}
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 transition-colors group-hover:bg-black/40">
                  <span className="flex h-16 w-16 items-center justify-center rounded-full btn-purple-primary shadow-xl transition-transform group-hover:scale-110">
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
          <div className="mb-8 rounded-2xl border border-purple-500/20 bg-purple-950/20 p-5 sm:p-6 backdrop-blur-md">
            <h3 className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-purple-400 font-semibold mb-3">
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
            <h3 className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-purple-400 font-semibold mb-4">
              <AlertCircle size={16} /> 1. Structured Incident Reporting Workflow
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
              {project.workflow.map((item, idx) => (
                <div
                  key={item.step}
                  className="relative flex flex-col justify-between rounded-xl border border-purple-500/20 bg-card p-4 transition-colors hover:border-purple-500/40"
                >
                  <div>
                    <span className="inline-block rounded-md bg-purple-500/15 px-2 py-0.5 font-mono text-[10px] font-bold text-purple-400 border border-purple-500/20 mb-2">
                      {item.status}
                    </span>
                    <h4 className="font-semibold text-sm text-foreground">
                      {item.step}
                    </h4>
                    {item.desc && (
                      <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                        {item.desc}
                      </p>
                    )}
                  </div>
                  {idx < project.workflow!.length - 1 && (
                    <div className="hidden md:block absolute -right-3 top-1/2 -translate-y-1/2 z-10 text-purple-400">
                      <ArrowRight size={16} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Features Grid */}
        {project.features && project.features.length > 0 && (
          <div className="mb-8 space-y-4">
            <h3 className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-purple-400 font-semibold mb-2">
              <BarChart3 size={16} /> Detailed System Features
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              {project.features.map((feat) => (
                <div
                  key={feat.title}
                  className="rounded-2xl border border-purple-500/15 bg-card/60 p-5 backdrop-blur-sm transition-all hover:border-purple-500/30"
                >
                  <h4 className="font-semibold text-base text-foreground mb-3 flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-purple-400 shrink-0" />
                    {feat.title}
                  </h4>
                  <ul className="space-y-2">
                    {feat.details.map((detail) => (
                      <li
                        key={detail}
                        className="text-xs text-muted-foreground flex items-start gap-2 leading-relaxed"
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-purple-400 shrink-0 mt-1.5" />
                        <span>{detail}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 🛠️ Technologies Used */}
        <div className="mb-8 rounded-2xl border border-purple-500/20 bg-card p-5 sm:p-6">
          <h3 className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-purple-400 font-semibold mb-4">
            <Cpu size={16} /> 🛠️ Technologies Used
          </h3>

          {project.detailedTech && project.detailedTech.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {project.detailedTech.map((item) => (
                <div
                  key={item.category}
                  className="flex flex-col justify-between rounded-xl border border-purple-500/15 bg-purple-950/20 p-3.5"
                >
                  <span className="font-mono text-[11px] font-semibold text-purple-300/80 uppercase">
                    {item.category}
                  </span>
                  <span className="mt-1 text-sm font-medium text-foreground">
                    {item.tech}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {project.technologies.map((tech) => (
                <span
                  key={tech}
                  className="rounded-lg border border-purple-500/20 bg-purple-950/30 px-3 py-1 font-mono text-xs text-purple-200"
                >
                  {tech}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* System Video Walkthrough at the Bottom */}
        {project.bottomVideo && (
          <div className="mb-8 rounded-2xl border border-purple-500/20 bg-card p-5 sm:p-6">
            <h3 className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-purple-400 font-semibold mb-4">
              <Play size={16} /> System Demonstration Video
            </h3>
            <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-purple-500/20 bg-black/40 shadow-inner">
              <video
                controls
                preload="metadata"
                className="h-full w-full object-cover"
              >
                <source src={project.bottomVideo} type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            </div>
          </div>
        )}

        {/* Role & Links Footer */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border/60 pt-6">
          <div className="font-mono text-xs text-muted-foreground">
            <span className="text-foreground font-semibold">Role:</span> {project.role}
          </div>

          <div className="flex flex-wrap gap-3">
            {project.liveUrl && (
              <a
                href={project.liveUrl}
                target="_blank"
                rel="noreferrer"
                className="btn-purple-primary inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold text-white shadow-md"
              >
                Live Demo <ExternalLink size={14} />
              </a>
            )}
            {project.githubUrl && (
              <a
                href={project.githubUrl}
                target="_blank"
                rel="noreferrer"
                className="btn-purple-secondary inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold text-foreground"
              >
                <GithubIcon size={14} /> GitHub Repo
              </a>
            )}
            <button
              type="button"
              onClick={onClose}
              className="btn-purple-secondary rounded-xl px-4 py-2 text-xs font-semibold text-foreground"
            >
              Close Showcase
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

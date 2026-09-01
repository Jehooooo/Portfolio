'use client'

import Image from 'next/image'
import { ArrowUpRight, ImageOff, Play, Info } from 'lucide-react'
import { GithubIcon } from '@/components/brand-icons'
import { cn } from '@/lib/utils'
import type { Project } from '@/lib/portfolio-data'

function ProjectMedia({ project }: { project: Project }) {
  const hasVideo = Boolean(project.video || project.youtube || project.vimeo)
  const thumb = project.image || '/images/placeholder.svg'

  // Video facade preview thumbnail
  if (hasVideo) {
    return (
      <div className="group/play relative h-full w-full overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={thumb}
          alt={project.title}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
        {/* Clean overlay & centered play badge */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/25 transition-colors group-hover/play:bg-black/40">
          <span className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full btn-bw-primary text-white shadow-xl backdrop-blur-xs transition-transform duration-200 group-hover/play:scale-110">
            <Play size={20} className="ml-0.5 sm:w-5 sm:h-5 text-white" fill="currentColor" />
          </span>
        </div>
      </div>
    )
  }

  // Image fallback
  if (project.image) {
    return (
      <Image
        src={project.image || '/images/placeholder.svg'}
        alt={`${project.title} preview`}
        fill
        sizes="(max-width: 768px) 100vw, 400px"
        className="object-cover transition-transform duration-500 group-hover:scale-105"
      />
    )
  }

  // No media
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-card text-muted-foreground">
      <ImageOff size={22} />
      <span className="font-mono text-xs">Add image or video</span>
    </div>
  )
}

const statusStyles: Record<Project['status'], string> = {
  Completed: 'bg-card text-foreground/80 border border-border',
  'In Progress': 'bg-chart-2/15 text-chart-2 border border-chart-2/20',
  Planned: 'bg-muted text-muted-foreground border border-border',
}

interface ProjectCardProps {
  project: Project
  onSelect?: (project: Project) => void
}

export function ProjectCard({ project, onSelect }: ProjectCardProps) {
  return (
    <article
      onClick={() => onSelect?.(project)}
      className="glass group flex h-full flex-col overflow-hidden rounded-2xl transition-all duration-300 hover:-translate-y-1.5 hover:border-foreground/30 hover:shadow-xl hover:shadow-black/20 cursor-pointer"
    >
      <div className="relative aspect-video w-full overflow-hidden border-b border-border">
        <ProjectMedia project={project} />
        <span
          className={cn(
            'absolute right-3 top-3 z-10 rounded-full px-2.5 py-1 font-mono text-[11px] font-medium backdrop-blur-md',
            statusStyles[project.status],
          )}
        >
          {project.status}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-lg font-bold text-foreground group-hover:text-foreground/80 transition-colors">
          {project.title}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground line-clamp-3">
          {project.description}
        </p>

        <p className="mt-3 font-mono text-xs text-muted-foreground">
          <span className="text-foreground font-semibold">Role:</span> {project.role}
        </p>

        <ul className="mt-4 flex flex-wrap gap-1.5">
          {project.technologies.map((tech) => (
            <li
              key={tech}
              className="rounded-md border border-border bg-card/60 px-2 py-0.5 font-mono text-[11px] text-foreground/80"
            >
              {tech}
            </li>
          ))}
        </ul>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-4">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onSelect?.(project)
            }}
            className="inline-flex items-center gap-1.5 rounded-lg btn-bw-primary px-3 py-2 text-xs font-semibold text-white shadow-md transition-transform duration-200 hover:scale-105 cursor-pointer"
          >
            <Info size={14} /> View Details
          </button>

          <div className="flex items-center gap-2">
            {project.liveUrl && (
              <a
                href={project.liveUrl}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 rounded-lg bg-accent/60 px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent"
              >
                Live <ArrowUpRight size={13} />
              </a>
            )}
            {project.githubUrl && (
              <a
                href={project.githubUrl}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 rounded-lg bg-accent/60 px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent"
              >
                <GithubIcon size={13} /> GitHub
              </a>
            )}
          </div>
        </div>
      </div>
    </article>
  )
}
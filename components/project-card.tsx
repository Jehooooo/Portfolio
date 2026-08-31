'use client'

import { useState } from 'react'
import Image from 'next/image'
import { ArrowUpRight, ImageOff, Play, Info } from 'lucide-react'
import { GithubIcon } from '@/components/brand-icons'
import { cn } from '@/lib/utils'
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

function ProjectMedia({ project }: { project: Project }) {
  const [playing, setPlaying] = useState(false)
  const yt = project.youtube ? youtubeId(project.youtube) : null
  const vm = project.vimeo ? vimeoId(project.vimeo) : null

  // 1. Local video file
  if (project.video) {
    return (
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
    )
  }

  // 2. YouTube / Vimeo — click-to-load facade for performance
  if (yt || vm) {
    const embedSrc = yt
      ? `https://www.youtube.com/embed/${yt}?autoplay=1`
      : `https://player.vimeo.com/video/${vm}?autoplay=1`
    const thumb = project.image || (yt ? `https://i.ytimg.com/vi/${yt}/hqdefault.jpg` : undefined)

    if (playing) {
      return (
        <iframe
          src={embedSrc}
          title={`${project.title} video`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="h-full w-full"
        />
      )
    }

    return (
      <button
        type="button"
        onClick={() => setPlaying(true)}
        aria-label={`Play ${project.title} video`}
        className="group/play relative h-full w-full"
      >
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumb || '/images/placeholder.svg'}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center bg-accent/40" />
        )}
        <span className="absolute inset-0 flex items-center justify-center bg-black/20 transition-colors group-hover/play:bg-black/30">
          <span className="flex h-14 w-14 items-center justify-center rounded-full btn-purple-primary text-white shadow-lg transition-transform duration-200 group-hover/play:scale-110">
            <Play size={22} className="ml-0.5 text-white" fill="currentColor" />
          </span>
        </span>
      </button>
    )
  }

  // 3. Image fallback
  if (project.image) {
    return (
      <Image
        src={project.image || '/images/placeholder.svg'}
        alt={`${project.title} preview`}
        fill
        sizes="(max-width: 768px) 100vw, 400px"
        className="object-cover"
      />
    )
  }

  // 4. No media — labeled placeholder
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-purple-950/20 text-muted-foreground">
      <ImageOff size={22} />
      <span className="font-mono text-xs">Add image or video</span>
    </div>
  )
}

const statusStyles: Record<Project['status'], string> = {
  Completed: 'bg-purple-500/15 text-purple-400 border border-purple-500/20',
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
      className="glass group flex h-full flex-col overflow-hidden rounded-2xl transition-all duration-300 hover:-translate-y-1.5 hover:border-purple-500/40 hover:shadow-xl hover:shadow-purple-950/30 cursor-pointer"
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
        <h3 className="text-lg font-semibold text-foreground group-hover:text-purple-400 transition-colors">
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
              className="rounded-md border border-purple-500/20 bg-purple-950/20 px-2 py-0.5 font-mono text-[11px] text-purple-300"
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
            className="inline-flex items-center gap-1.5 rounded-lg btn-purple-primary px-3 py-2 text-xs font-semibold text-white shadow-md transition-transform duration-200 hover:scale-105"
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
                className="inline-flex items-center gap-1 rounded-lg bg-accent/40 px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent"
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
                className="inline-flex items-center gap-1 rounded-lg bg-accent/40 px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent"
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

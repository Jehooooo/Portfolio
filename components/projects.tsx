'use client'

import { useState } from 'react'
import { ProjectCard } from '@/components/project-card'
import { ProjectModal } from '@/components/project-modal'
import { Reveal } from '@/components/reveal'
import { projects, type Project } from '@/lib/portfolio-data'

export function Projects() {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)

  return (
    <section
      id="projects"
      className="mx-auto max-w-6xl scroll-mt-24 px-4 py-16 sm:px-6 md:py-24"
    >
      <div className="max-w-2xl">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-foreground/60 font-semibold">
          Work & Case Studies
        </p>
        <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
          Featured Projects
        </h2>
        <p className="mt-4 text-pretty leading-relaxed text-muted-foreground">
          Explore my featured engineering projects. Click any project card to view full system overview, workflows, analytics, and tech stack details.
        </p>
      </div>

      <div className={`mt-10 grid gap-6 ${projects.length === 1 ? 'max-w-2xl' : 'sm:grid-cols-2 lg:grid-cols-3'}`}>
        {projects.map((project, i) => (
          <Reveal key={project.title} delay={i * 80} as="div">
            <ProjectCard project={project} onSelect={setSelectedProject} />
          </Reveal>
        ))}
      </div>

      {/* Interactive Project Showcase Modal */}
      <ProjectModal
        project={selectedProject}
        onClose={() => setSelectedProject(null)}
      />
    </section>
  )
}
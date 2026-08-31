import { SiteNav } from '@/components/site-nav'
import { Hero } from '@/components/hero'
import { About } from '@/components/about'
import { Projects } from '@/components/projects'
import { Skills } from '@/components/skills'
import { Credentials } from '@/components/credentials'
import { Contact } from '@/components/contact'
import { SiteFooter } from '@/components/site-footer'
import { AiChat } from '@/components/ai-chat'

export default function Page() {
  return (
    <div className="relative min-h-screen w-full max-w-full overflow-x-hidden">
      <div className="page-glow" aria-hidden="true" />
      <SiteNav />
      <main>
        <Hero />
        <About />
        <Projects />
        <Skills />
        <Credentials />
        <Contact />
      </main>
      <SiteFooter />
      <AiChat />
    </div>
  )
}

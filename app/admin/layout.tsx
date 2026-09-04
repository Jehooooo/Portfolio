import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Admin Command Center | Jehosue Biscarra',
  description: 'Internal administration and AI knowledge moderation command center.',
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

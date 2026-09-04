import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'

const geistSans = Geist({
  subsets: ['latin'],
  variable: '--font-geist-sans',
})

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
})

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://jehooooo.vercel.app'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Jehosue (Jeho) Biscarra | Full Stack Web Developer and AI Systems Developer',
    template: '%s | Jehosue Biscarra',
  },
  description:
    'Portfolio & interactive AI persona of Jehosue (Jeho) Biscarra — Full Stack Web Developer and AI Systems Developer specializing in full-stack web applications, AI systems, and modern cloud architecture.',
  keywords: [
    'Jehosue Biscarra',
    'Jeho Biscarra',
    'Full Stack Web Developer',
    'AI Systems Developer',
    'Software Engineer',
    'Full Stack Developer',
    'AI Engineer',
    'Next.js',
    'React',
    'TypeScript',
    'Python',
    'MongoDB Atlas',
    'Google Gemini AI',
    'DMMMSU',
    'Web Developer Philippines',
    'Portfolio',
  ],
  authors: [{ name: 'Jehosue Biscarra', url: siteUrl }],
  creator: 'Jehosue Biscarra',
  publisher: 'Jehosue Biscarra',
  icons: {
    icon: [
      { url: '/images/profile.png', type: 'image/png' },
      { url: '/icon.png', type: 'image/png' },
    ],
    apple: [{ url: '/images/profile.png', sizes: '180x180', type: 'image/png' }],
    shortcut: ['/images/profile.png'],
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: siteUrl,
    siteName: 'Jehosue Biscarra Portfolio',
    title: 'Full Stack Web Developer and AI Systems Developer',
    description:
      'Portfolio & interactive AI persona of Jehosue (Jeho) Biscarra — Full Stack Web Developer and AI Systems Developer specializing in full-stack web applications, AI systems, and modern cloud architecture.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Full Stack Web Developer and AI Systems Developer',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Full Stack Web Developer and AI Systems Developer',
    description:
      'Portfolio & interactive AI persona of Jehosue (Jeho) Biscarra — Full Stack Web Developer and AI Systems Developer specializing in full-stack web applications, AI systems, and modern cloud architecture.',
    images: ['/og-image.png'],
    creator: '@jehooooo',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

export const viewport: Viewport = {
  colorScheme: 'dark light',
  themeColor: '#1a1a1f',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} dark bg-background`}
      suppressHydrationWarning
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Source+Code+Pro:ital,wght@0,200..900;1,200..900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans antialiased">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}

import { ImageResponse } from 'next/og'

export const socialImageAlt =
  'Jehosue (Jeho) Biscarra — Software Engineer & AI Systems Developer'

export const socialImageSize = {
  width: 1200,
  height: 630,
}

export const socialImageContentType = 'image/png'

export function generateSocialImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          backgroundColor: '#09090b',
          backgroundImage:
            'radial-gradient(circle at 25px 25px, rgba(255,255,255,0.06) 2%, transparent 0%), radial-gradient(ellipse 60% 50% at 85% 15%, rgba(16, 185, 129, 0.18), transparent 70%), radial-gradient(ellipse 50% 50% at 15% 85%, rgba(59, 130, 246, 0.15), transparent 70%)',
          backgroundSize: '80px 80px, 100% 100%, 100% 100%',
          padding: '64px 72px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          color: '#ffffff',
          position: 'relative',
        }}
      >
        {/* Subtle border outline glow */}
        <div
          style={{
            position: 'absolute',
            inset: '24px',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '24px',
            pointerEvents: 'none',
          }}
        />

        {/* Top Header Row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '9999px',
              padding: '8px 18px',
            }}
          >
            <div
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: '#10b981',
                boxShadow: '0 0 12px #10b981',
              }}
            />
            <span
              style={{
                fontSize: '15px',
                fontWeight: 600,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: '#a1a1aa',
              }}
            >
              Interactive Portfolio & AI Persona
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontFamily: 'monospace',
              fontSize: '14px',
              color: '#71717a',
            }}
          >
            <span>dmmmsu • cs honors</span>
          </div>
        </div>

        {/* Main Content Area */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            marginTop: '20px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
            }}
          >
            <h1
              style={{
                fontSize: '62px',
                fontWeight: 800,
                letterSpacing: '-0.03em',
                lineHeight: 1.1,
                margin: 0,
                color: '#ffffff',
              }}
            >
              Jehosue (Jeho) Biscarra
            </h1>
          </div>

          <p
            style={{
              fontSize: '28px',
              fontWeight: 600,
              color: '#38bdf8',
              margin: 0,
              letterSpacing: '-0.01em',
            }}
          >
            Software Engineer & AI Systems Developer
          </p>

          <p
            style={{
              fontSize: '20px',
              color: '#a1a1aa',
              margin: 0,
              maxWidth: '850px',
              lineHeight: 1.45,
            }}
          >
            Engineering resilient full-stack applications, distributed MongoDB Atlas architectures,
            and custom conversational AI pipelines trained by Jeho.
          </p>
        </div>

        {/* Bottom Tech Pills & Domain */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            paddingTop: '24px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            {['Next.js 16', 'TypeScript', 'Python', 'MongoDB Atlas', 'Conversational AI'].map(
              (tech) => (
                <div
                  key={tech}
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '8px',
                    padding: '6px 14px',
                    fontSize: '14px',
                    fontFamily: 'monospace',
                    fontWeight: 500,
                    color: '#e4e4e7',
                  }}
                >
                  {tech}
                </div>
              ),
            )}
          </div>

          <div
            style={{
              fontSize: '16px',
              fontFamily: 'monospace',
              fontWeight: 600,
              color: '#10b981',
            }}
          >
            jehooooo.vercel.app
          </div>
        </div>
      </div>
    ),
    {
      ...socialImageSize,
    },
  )
}

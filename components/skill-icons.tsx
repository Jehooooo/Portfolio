import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement> & { size?: number }

export function HtmlIcon({ size = 24, className, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...props}>
      <path fill="#E34F26" d="M1.5 0h21l-1.91 21.563L11.97 24l-8.564-2.438L1.5 0z" />
      <path fill="#EF652A" d="M12 2.18v19.56l6.98-1.988 1.572-17.572H12z" />
      <path fill="#FFF" d="M12 8.79H8.2l-.24-2.72h8.08l.24-2.72H5.04l.72 8.16H12v-2.72zm0 6.632l-3.52-.952-.225-2.52H5.515l.445 5.04 6.04 1.68v-3.248z" />
      <path fill="#EBEBEB" d="M12 8.79v2.72h3.56l-.34 3.84-3.22.87v3.248l6.02-1.68.64-7.158H12zm0-5.44v2.72h5.6l.24-2.72H12z" />
    </svg>
  )
}

export function CssIcon({ size = 24, className, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...props}>
      <path fill="#1572B6" d="M1.5 0h21l-1.91 21.563L11.97 24l-8.564-2.438L1.5 0z" />
      <path fill="#33A9DC" d="M12 2.18v19.56l6.98-1.988 1.572-17.572H12z" />
      <path fill="#FFF" d="M12 8.79H8.2l-.24-2.72H12V3.35H5.04l.72 8.16H12V8.79zm0 6.632l-3.52-.952-.225-2.52H5.515l.445 5.04 6.04 1.68v-3.248z" />
      <path fill="#EBEBEB" d="M12 8.79v2.72h3.56l-.34 3.84-3.22.87v3.248l6.02-1.68.86-9.68H12v2.72z" />
    </svg>
  )
}

export function JsIcon({ size = 24, className, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...props}>
      <rect width="24" height="24" rx="4" fill="#F7DF1E" />
      <path fill="#000" d="M6.7 18.5c1.2.7 2.4 1.2 3.8 1.2 1.8 0 2.9-.9 2.9-2.2 0-1.4-.9-2.1-2.9-2.9l-1-.4c-2.3-.9-3.7-2.2-3.7-4.6 0-2.6 2-4.5 5.3-4.5 1.5 0 2.7.4 3.7.9l-.9 2.5c-.8-.5-1.7-.8-2.7-.8-1.3 0-2.1.7-2.1 1.7 0 1.2.8 1.8 2.6 2.6l1 .4c2.6 1.1 4.1 2.3 4.1 4.8 0 2.9-2.2 4.7-6 4.7-1.8 0-3.3-.4-4.5-1.1l1-2.3zM17.8 19.3c1.1.6 2.2 1 3.2 1 1.3 0 2-.6 2-2.1V7.5h-3.3v10.3c0 .8-.3 1.1-.9 1.1-.3 0-.6-.1-.9-.2l-.1.6z" />
    </svg>
  )
}

export function ReactIcon({ size = 24, className, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={className} {...props}>
      <circle cx="50" cy="50" r="9" fill="#61DAFB" />
      <g fill="none" stroke="#61DAFB" strokeWidth="5">
        <ellipse cx="50" cy="50" rx="42" ry="16" />
        <ellipse cx="50" cy="50" rx="42" ry="16" transform="rotate(60 50 50)" />
        <ellipse cx="50" cy="50" rx="42" ry="16" transform="rotate(120 50 50)" />
      </g>
    </svg>
  )
}

export function PythonIcon({ size = 24, className, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...props}>
      <path fill="#3776AB" d="M11.894 1.5c-4.408 0-4.137 1.91-4.137 1.91l.006 1.977h4.2v.596H6.155S1.5 5.487 1.5 11.884c0 6.398 3.993 6.16 3.993 6.16l2.385-.002v-3.366s-.13-3.993 3.927-3.993h3.896s3.73.065 3.73-3.666V5.41s.296-3.91-5.537-3.91zm-2.28 1.488a.936.936 0 1 1 0 1.872.936.936 0 0 1 0-1.872z" />
      <path fill="#FFD43B" d="M12.106 22.5c4.408 0 4.137-1.91 4.137-1.91l-.006-1.977h-4.2v-.596h5.807s4.655.496 4.655-5.901c0-6.398-3.993-6.16-3.993-6.16l-2.385.002v3.366s.13 3.993-3.927 3.993H8.302s-3.73-.065-3.73 3.666v3.612s-.296 3.91 5.537 3.91zm2.28-1.488a.936.936 0 1 1 0-1.872.936.936 0 0 1 0 1.872z" />
    </svg>
  )
}

export function JavaIcon({ size = 24, className, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...props}>
      <path fill="#E76F00" d="M14.28 18.06s1.24-.65 2.45-.65c1.68 0 2.2.82 2.2.82s-.98-.67-2.23-.67c-1.3 0-2.42.5-2.42.5zM12.87 19.86s1.42-.77 2.87-.77c2.1 0 2.92.91 2.92.91s-1.25-.79-2.91-.79c-1.74 0-2.88.65-2.88.65zM15.43 14.88s1.82 1.42.47 2.86c1.47-.48 2.24-1.41 1.76-2.2-.5-.81-2.23-.66-2.23-.66z" />
      <path fill="#5382A1" d="M8.7 15.65s-1.89.47-3.23.47c-2.38 0-3.34-.84-3.34-.84s.88.61 2.96.61c1.88 0 3.61-.24 3.61-.24zm-1.04 2.14s-2.15.54-3.6.54c-2.67 0-3.8-.97-3.8-.97s1 .75 3.32.75c2.14 0 4.08-.32 4.08-.32zm8.01-6.52s.93 1.07.13 2.15c.87-.36 1.4-.97 1.15-1.57-.27-.63-1.28-.58-1.28-.58zM11.97 2.5s1.95 2.1-.48 4.77c-2.02 2.23-.27 3.51.52 4.96.8 1.46.22 2.6-.96 3.64 2.24-1.92 2.5-3.64 1.48-5.06-1.34-1.87-1.84-2.7.53-4.99 1.44-1.4 1.05-2.65-1.09-3.32z" />
      <path fill="#E76F00" d="M10.23 23.36c4.08-.26 7.42-1.7 7.42-1.7s-1.06.41-3.22.6c-2.52.22-5.46.12-7.51-.25 0 0 .97.35 3.31.35z" />
    </svg>
  )
}

export function DartIcon({ size = 24, className, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...props}>
      <path fill="#0175C2" d="M4.1 12l.01-6.79L10 1.11h6.78L4.1 12z" />
      <path fill="#02569B" d="M4.11 12l6.8 6.78L22.89 6.89V1.11H17.11L4.11 12z" />
      <path fill="#01579B" d="M10.91 18.78L16.69 23h5.78v-5.78l-4.11-4.11-7.45 5.67z" />
      <path fill="#29B6F6" d="M4.11 12l8.44-8.44h4.56L4.11 16.56V12z" />
    </svg>
  )
}

export function MongodbIcon({ size = 24, className, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...props}>
      <path fill="#47A248" d="M12 0c-.3 0-.6.1-.8.4L9.4 3.7C7.2 6.8 6 10.4 6 14.2c0 3.8 1.8 7.3 4.9 9.3l.1.1.2.1c.3.2.6.3.9.3s.6-.1.9-.3l.2-.1.1-.1c3.1-2 4.9-5.5 4.9-9.3 0-3.8-1.2-7.4-3.4-10.5L12.8.4c-.2-.3-.5-.4-.8-.4zm.8 2.6c1.8 2.7 2.8 5.8 2.8 9.1 0 3.2-1.4 6.2-4 8-.1.1-.2.1-.3.1s-.2 0-.3-.1c-2.6-1.8-4-4.8-4-8 0-3.3 1-6.4 2.8-9.1l1.5-2.1 1.5 2.1z" />
      <path fill="#47A248" d="M11.5 4v16c0 .3.2.5.5.5s.5-.2.5-.5V4c0-.3-.2-.5-.5-.5s-.5.2-.5.5z" />
    </svg>
  )
}

export function GitIcon({ size = 24, className, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...props}>
      <path fill="#F05032" d="M23.546 10.93L13.067.452c-.604-.603-1.582-.603-2.188 0L8.708 2.627l2.76 2.76c.645-.216 1.378-.07 1.889.44.516.516.662 1.257.436 1.903l2.662 2.662c.646-.226 1.387-.08 1.903.436.7.7.7 1.834 0 2.534-.7.7-1.835.7-2.535 0-.528-.528-.669-1.282-.423-1.936l-2.48-2.48v6.236c.15.086.29.194.408.312.7.7.7 1.834 0 2.534-.7.7-1.834.7-2.534 0-.7-.7-.7-1.834 0-2.534.14-.14.298-.252.464-.33v-6.332l-2.9-2.9L.454 10.928c-.604.604-.604 1.582 0 2.188l10.48 10.478c.604.604 1.582.604 2.187 0l10.425-10.476c.604-.603.604-1.581 0-2.188z" />
    </svg>
  )
}

export function GithubSkillIcon({ size = 24, className, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#FFFFFF" className={className} {...props}>
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  )
}

export function VercelIcon({ size = 24, className, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#FFFFFF" className={className} {...props}>
      <path d="M12 1L24 22H0L12 1Z" />
    </svg>
  )
}

export function PhotoshopIcon({ size = 24, className, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...props}>
      <rect width="24" height="24" rx="4" fill="#001E36" />
      <rect x="0.5" y="0.5" width="23" height="23" rx="3.5" fill="none" stroke="#31A8FF" strokeWidth="1" />
      <path fill="#31A8FF" d="M6 17V7h4.5a3 3 0 010 6H6" />
      <path fill="#001E36" d="M8 9v2.5h2.5a1.25 1.25 0 000-2.5H8z" />
      <path fill="#31A8FF" d="M13.8 14.2c.4.6 1.1.9 1.9.9.8 0 1.4-.3 1.4-.9 0-.6-.6-.9-1.4-1.1l-.5-.1c-1-.3-1.8-.7-1.8-1.9 0-1.2 1.1-2 2.5-2 1 0 1.8.3 2.3 1l-1.1 1.1c-.3-.4-.8-.6-1.3-.6-.5 0-.9.2-.9.5 0 .5.5.7 1.3.9l.5.1c1.2.3 2 .8 2 2 0 1.3-1.1 2.1-2.7 2.1-1.1 0-2.1-.4-2.7-1.3l1.2-1.2z" />
    </svg>
  )
}

export function PremiereIcon({ size = 24, className, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...props}>
      <rect width="24" height="24" rx="4" fill="#00005B" />
      <rect x="0.5" y="0.5" width="23" height="23" rx="3.5" fill="none" stroke="#9999FF" strokeWidth="1" />
      <path fill="#9999FF" d="M6 17V7h4.5a3 3 0 010 6H6" />
      <path fill="#00005B" d="M8 9v2.5h2.5a1.25 1.25 0 000-2.5H8z" />
      <path fill="#9999FF" d="M13.5 17v-6h2a2 2 0 012 2v4h-2v-4h-.2v4h-1.8z" />
    </svg>
  )
}

export function MysqlIcon({ size = 24, className, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...props}>
      <path fill="#00618A" d="M16.5 13.5c-.8 0-1.5.7-1.5 1.5s.7 1.5 1.5 1.5 1.5-.7 1.5-1.5-.7-1.5-1.5-1.5z" />
      <path fill="#00618A" d="M21.9 11.2c-.3-.4-.8-.6-1.3-.6-.8 0-1.5.5-1.8 1.2-.2-.6-.7-1.1-1.4-1.3-.7-.2-1.5 0-2.1.4-.4-.5-1-.8-1.6-.9h-.5c-.9 0-1.8.5-2.2 1.3-.3.5-.4 1.1-.3 1.7.1.6.4 1.1.9 1.5l1.6 1.3c.3.2.7.3 1.1.3h3.5c1.1 0 2-.9 2-2v-2.9z" />
      <path fill="#E48E00" d="M4 14.5c.3-1.8 1.6-3.3 3.3-3.8 1.7-.5 3.6-.1 4.9 1 1.3 1.1 1.9 2.9 1.5 4.6-.4 1.7-1.7 3-3.4 3.4-1.7.4-3.5-.1-4.7-1.3-1.2-1.1-1.8-2.6-1.6-3.9z" />
    </svg>
  )
}

export function NextjsIcon({ size = 24, className, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 180 180" className={className} {...props}>
      <mask id="mask_next" maskUnits="userSpaceOnUse" x="0" y="0" width="180" height="180">
        <circle cx="90" cy="90" r="90" fill="#fff"/>
      </mask>
      <g mask="url(#mask_next)">
        <circle cx="90" cy="90" r="90" fill="#000"/>
        <path d="M149.508 157.52L69.141 54H54v72h14.4V72.587l68.767 89.263a89.37 89.37 0 002.341-4.33z" fill="url(#gradient_next)"/>
        <path d="M115.2 54v72h14.4V54h-14.4z" fill="#fff"/>
      </g>
      <defs>
        <linearGradient id="gradient_next" x1="109" y1="116.5" x2="144.5" y2="160.5" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fff"/>
          <stop offset="1" stopColor="#fff" stopOpacity="0"/>
        </linearGradient>
      </defs>
    </svg>
  )
}

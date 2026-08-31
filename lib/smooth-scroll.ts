/**
 * Custom animated smooth scroll with easing.
 * Uses requestAnimationFrame for a visible, gradual scroll-down animation
 * instead of the browser's native smooth scroll which can feel instant.
 */

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

function animateScrollTo(targetY: number, duration = 800) {
  const startY = window.scrollY
  const distance = targetY - startY
  let startTime: number | null = null

  function step(currentTime: number) {
    if (startTime === null) startTime = currentTime
    const elapsed = currentTime - startTime
    const progress = Math.min(elapsed / duration, 1)
    const easedProgress = easeInOutCubic(progress)

    window.scrollTo(0, startY + distance * easedProgress)

    if (progress < 1) {
      requestAnimationFrame(step)
    }
  }

  requestAnimationFrame(step)
}

export function smoothScrollTo(
  e: React.MouseEvent<HTMLAnchorElement>,
  navHeight = 80,
) {
  const href = e.currentTarget.getAttribute('href')
  if (!href || !href.startsWith('#')) return

  const target = document.getElementById(href.slice(1))
  if (!target) return

  e.preventDefault()

  const top = target.getBoundingClientRect().top + window.scrollY - navHeight

  // Use longer duration for bigger distances so it feels natural
  const distance = Math.abs(top - window.scrollY)
  const duration = Math.min(Math.max(distance * 0.6, 500), 1200)

  animateScrollTo(top, duration)
}

/**
 * Smooth Animated Scroll Engine with easeInOutCubic curve.
 * Animates smoothly both upwards and downwards when clicking navigation links.
 */

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

export function scrollToElement(elementId: string, navHeight = 76) {
  if (typeof window === 'undefined') return

  const startY = window.pageYOffset || document.documentElement.scrollTop || window.scrollY || 0
  let targetY = 0

  if (elementId !== 'home') {
    const target = document.getElementById(elementId)
    if (target) {
      const rect = target.getBoundingClientRect()
      targetY = Math.max(0, rect.top + startY - navHeight)
    }
  }

  const distance = targetY - startY
  if (Math.abs(distance) < 4) return

  // Duration scales naturally with distance (400ms to 950ms)
  const duration = Math.min(Math.max(Math.abs(distance) * 0.4, 450), 950)
  let startTime: number | null = null

  function step(currentTime: number) {
    if (startTime === null) startTime = currentTime
    const elapsed = currentTime - startTime
    const progress = Math.min(elapsed / duration, 1)
    const easedProgress = easeInOutCubic(progress)

    window.scrollTo(0, Math.round(startY + distance * easedProgress))

    if (progress < 1) {
      requestAnimationFrame(step)
    }
  }

  requestAnimationFrame(step)
}

export function smoothScrollTo(
  e: React.MouseEvent<HTMLAnchorElement>,
  navHeight = 76,
) {
  const href = e.currentTarget.getAttribute('href')
  if (!href || !href.startsWith('#')) return

  e.preventDefault()
  const targetId = href.slice(1)
  scrollToElement(targetId, navHeight)
}
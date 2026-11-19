import { useLayoutEffect, useRef, useState } from 'react'

// Widest content container used across pages (max-w-6xl) plus its px-4 padding.
const MAX_CONTENT_WIDTH = 1152
const START_Y = 78 // sit fully below the sticky navbar (60–64px tall)
const CELL_OFFSETS = [70, 150, 240] // scroll-driven "blood cells" trailing the drop

/** Builds a smooth serpentine path confined to the empty left margin corridor. */
function buildPath(width, height) {
  const endY = Math.max(START_Y + 80, height - 28)
  const contentLeft = (width - Math.min(width, MAX_CONTENT_WIDTH)) / 2 + 16
  const narrow = contentLeft < 50

  // Centre and amplitude stay inside the gutter (or the 16px page padding).
  // On mobile the drop + its glow must fit between x=0 and the cards at x=16.
  const center = narrow ? 8 : contentLeft * 0.42
  const amp = narrow ? 2 : Math.min(Math.max(contentLeft * 0.25, 8), 40)

  const segments = Math.min(Math.max(Math.round((endY - START_Y) / 620), 3), 14)
  const seg = (endY - START_Y) / segments

  const xs = [center]
  for (let i = 1; i < segments; i += 1) {
    xs.push(center + (i % 2 === 1 ? amp : -amp))
  }
  xs.push(center)

  const r = (n) => Math.round(n * 10) / 10
  let d = `M ${r(xs[0])} ${r(START_Y)}`
  for (let i = 1; i < xs.length; i += 1) {
    const y0 = START_Y + (i - 1) * seg
    const y1 = START_Y + i * seg
    d += ` C ${r(xs[i - 1])} ${r(y0 + seg / 2)}, ${r(xs[i])} ${r(y1 - seg / 2)}, ${r(xs[i])} ${r(y1)}`
  }
  return { d, startX: xs[0], scale: narrow ? 0.48 : 1 }
}

/**
 * Blood-flow journey: a glowing curved vein down the left margin with a
 * dimensional blood drop that travels along it. Every moving element is
 * positioned from the page's actual scroll position — there is no autoplay.
 */
export default function BloodFlow() {
  const svgRef = useRef(null)
  const flowRef = useRef(null)
  const dropRef = useRef(null)
  const cellRefs = useRef([])
  const progressRef = useRef(0)
  const scaleRef = useRef(1) // keeps the scroll listener in sync with responsive scaling
  const [geom, setGeom] = useState({ d: '', startX: 0, scale: 1 })

  const readProgress = () => {
    const doc = document.documentElement
    const scrollable = doc.scrollHeight - window.innerHeight
    progressRef.current =
      scrollable > 0 ? Math.min(1, Math.max(0, window.scrollY / scrollable)) : 0
  }

  // Direct attribute writes keep scrolling free of React re-renders.
  const render = () => {
    const flow = flowRef.current
    const drop = dropRef.current
    if (!flow || !drop) return

    const total = flow.getTotalLength()
    if (!total) return
    const p = progressRef.current
    const len = p * total

    // The traversed portion of the vein fills with blood.
    flow.setAttribute('stroke-dasharray', String(total))
    flow.setAttribute('stroke-dashoffset', String(total * (1 - p)))

    const at = (l) => flow.getPointAtLength(Math.min(total, Math.max(0, l)))
    const angleAt = (l) => {
      const a = at(l - 1)
      const b = at(l + 1)
      return (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI
    }

    // Head of the flow: the drop.
    const point = at(len)
    drop.setAttribute(
      'transform',
      `translate(${point.x} ${point.y}) rotate(${angleAt(len) + 90}) scale(${scaleRef.current})`,
    )

    // Trailing cells make the flow direction unambiguous; all scroll-linked.
    CELL_OFFSETS.forEach((offset, i) => {
      const cell = cellRefs.current[i]
      if (!cell) return
      const cellLength = len - offset
      if (cellLength < 6) {
        cell.setAttribute('opacity', '0')
        return
      }
      const cp = at(cellLength)
      cell.setAttribute(
        'transform',
        `translate(${cp.x} ${cp.y}) rotate(${angleAt(cellLength) + 90}) scale(${scaleRef.current})`,
      )
      cell.setAttribute('opacity', String([0.6, 0.38, 0.22][i]))
    })
  }

  const measure = () => {
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    if (rect.width < 1 || rect.height < 1) return
    const next = buildPath(rect.width, rect.height)
    setGeom((prev) =>
      prev.d === next.d && prev.scale === next.scale ? prev : next,
    )
    render()
  }

  useLayoutEffect(() => {
    let renderRaf = 0
    let measureRaf = 0

    const scheduleRender = () => {
      if (renderRaf) return
      renderRaf = window.requestAnimationFrame(() => {
        renderRaf = 0
        readProgress()
        render()
      })
    }

    const scheduleMeasure = () => {
      if (measureRaf) return
      measureRaf = window.requestAnimationFrame(() => {
        measureRaf = 0
        readProgress()
        measure()
        render()
      })
    }

    readProgress()
    measure()
    render()

    window.addEventListener('scroll', scheduleRender, { passive: true })
    window.addEventListener('resize', scheduleMeasure)
    window.addEventListener('orientationchange', scheduleMeasure)

    let observer
    if (typeof ResizeObserver !== 'undefined' && svgRef.current) {
      observer = new ResizeObserver(scheduleMeasure) // catches route changes
      observer.observe(svgRef.current)
    }

    return () => {
      window.removeEventListener('scroll', scheduleRender)
      window.removeEventListener('resize', scheduleMeasure)
      window.removeEventListener('orientationchange', scheduleMeasure)
      if (observer) observer.disconnect()
      if (renderRaf) window.cancelAnimationFrame(renderRaf)
      if (measureRaf) window.cancelAnimationFrame(measureRaf)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Re-position as soon as a new path has been committed to the DOM.
  useLayoutEffect(() => {
    scaleRef.current = geom.scale
    render()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geom.d, geom.scale])

  return (
    <svg
      ref={svgRef}
      className="pointer-events-none absolute inset-0 z-10 h-full w-full"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="bloodFlowGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F87171" />
          <stop offset="45%" stopColor="#DC2626" />
          <stop offset="100%" stopColor="#991B1B" />
        </linearGradient>
        <radialGradient id="bloodDropGradient" cx="35%" cy="25%" r="80%">
          <stop offset="0%" stopColor="#FF8A8A" />
          <stop offset="45%" stopColor="#EF4444" />
          <stop offset="100%" stopColor="#991B1B" />
        </radialGradient>
        <radialGradient id="bloodGlowGradient">
          <stop offset="0%" stopColor="rgba(220,38,38,0.4)" />
          <stop offset="100%" stopColor="rgba(220,38,38,0)" />
        </radialGradient>
      </defs>

      {geom.d && (
        <>
          {/* Soft glow around the vein */}
          <path
            d={geom.d}
            fill="none"
            stroke="rgba(220,38,38,0.16)"
            strokeWidth="11"
            strokeLinecap="round"
          />
          {/* Continuous visible pathway */}
          <path
            d={geom.d}
            fill="none"
            stroke="#F7BBC4"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          {/* Scroll-filled blood flow */}
          <path
            ref={flowRef}
            d={geom.d}
            fill="none"
            stroke="url(#bloodFlowGradient)"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          {/* Starting point marker */}
          <circle
            cx={geom.startX}
            cy={START_Y}
            r="4.5"
            fill="#FFF5F7"
            stroke="#DC2626"
            strokeWidth="2"
          />

          {/* Cells trailing the drop — positions come from scroll progress */}
          {CELL_OFFSETS.map((_, i) => (
            <g
              key={i}
              ref={(el) => {
                cellRefs.current[i] = el
              }}
              transform="translate(-100 -100)"
              opacity="0"
            >
              <circle r={4 - i * 0.7} fill="#DC2626" />
            </g>
          ))}

          {/* The blood drop */}
          <g ref={dropRef} transform="translate(-100 -100)">
            <circle r="12" fill="url(#bloodGlowGradient)" />
            <path
              d="M0,-11 C3.8,-5.6 8,-1.8 8,2.6 A8,8 0 0 1 -8,2.6 C-8,-1.8 -3.8,-5.6 0,-11 Z"
              fill="url(#bloodDropGradient)"
              stroke="#991B1B"
              strokeWidth="0.8"
            />
            <ellipse cx="-2.3" cy="-1.2" rx="1.8" ry="2.6" fill="rgba(255,255,255,0.75)" />
          </g>
        </>
      )}
    </svg>
  )
}

import React, { useCallback, useEffect, useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import GlassSurface from './GlassSurface'
import BookingForm from './BookingForm'
import { useBooking } from './BookingContext'
import './BookingModal.css'

export default function BookingModal() {
  const { open, service, closeBooking } = useBooking()
  const stackRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLElement>(null)
  const openTlRef = useRef<gsap.core.Timeline | null>(null)
  const closeTweenRef = useRef<gsap.core.Tween | null>(null)
  const busyRef = useRef(false)
  const wasOpenRef = useRef(false)

  useLayoutEffect(() => {
    const stack = stackRef.current
    const panel = panelRef.current
    if (!stack || !panel) return

    gsap.set(stack, { yPercent: 110, autoAlpha: 0 })

    const contentEls = Array.from(panel.querySelectorAll('.booking-sheet-animate')) as HTMLElement[]
    if (contentEls.length) {
      gsap.set(contentEls, { y: 18, opacity: 0 })
    }
  }, [])

  const buildOpenTimeline = useCallback(() => {
    const stack = stackRef.current
    const panel = panelRef.current
    if (!stack || !panel) return null

    openTlRef.current?.kill()
    closeTweenRef.current?.kill()

    const contentEls = Array.from(panel.querySelectorAll('.booking-sheet-animate')) as HTMLElement[]
    gsap.set(stack, { yPercent: 110, autoAlpha: 0 })
    if (contentEls.length) {
      gsap.set(contentEls, { y: 18, opacity: 0 })
    }

    const tl = gsap.timeline({ paused: true })

    tl.fromTo(
      stack,
      { yPercent: 110, autoAlpha: 0 },
      { yPercent: 0, autoAlpha: 1, duration: 0.62, ease: 'power4.out' },
      0
    )

    if (contentEls.length) {
      tl.to(
        contentEls,
        {
          y: 0,
          opacity: 1,
          duration: 0.55,
          ease: 'power3.out',
          stagger: { each: 0.05, from: 'start' },
        },
        0.18
      )
    }

    openTlRef.current = tl
    return tl
  }, [])

  const playOpen = useCallback(() => {
    if (busyRef.current) return
    busyRef.current = true
    const tl = buildOpenTimeline()
    if (tl) {
      tl.eventCallback('onComplete', () => {
        busyRef.current = false
      })
      tl.play(0)
    } else {
      busyRef.current = false
    }
  }, [buildOpenTimeline])

  const playClose = useCallback(() => {
    openTlRef.current?.kill()
    openTlRef.current = null

    const stack = stackRef.current
    const panel = panelRef.current
    if (!stack) return

    closeTweenRef.current?.kill()
    closeTweenRef.current = gsap.to(stack, {
      yPercent: 110,
      autoAlpha: 0,
      duration: 0.28,
      ease: 'power3.in',
      overwrite: 'auto',
      onComplete: () => {
        if (panel) {
          const contentEls = Array.from(panel.querySelectorAll('.booking-sheet-animate')) as HTMLElement[]
          if (contentEls.length) {
            gsap.set(contentEls, { y: 18, opacity: 0 })
          }
        }
        busyRef.current = false
      },
    })
  }, [])

  useEffect(() => {
    if (open) {
      playOpen()
    } else if (wasOpenRef.current) {
      playClose()
    }
    wasOpenRef.current = open
  }, [open, playOpen, playClose])

  useEffect(() => {
    if (!open) return

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeBooking()
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, closeBooking])

  return (
    <div
      className="booking-sheet-wrapper"
      data-open={open || undefined}
      aria-hidden={!open}
    >
      <div ref={stackRef} className="booking-sheet-stack">
        <aside
          ref={panelRef}
          id="booking-sheet-panel"
          className="booking-sheet-panel"
          aria-hidden={!open}
          role="dialog"
          aria-modal="false"
          aria-labelledby="booking-sheet-title"
        >
          <GlassSurface
            width="100%"
            height="100%"
            borderRadius={22}
            brightness={32}
            opacity={0.92}
            blur={16}
            backgroundOpacity={0.22}
            saturation={1.65}
            className="booking-sheet-glass"
          >
            <div className="booking-sheet-inner">
              <header className="booking-sheet-head booking-sheet-animate">
                <h2 id="booking-sheet-title" className="booking-sheet-title">book</h2>
                <button
                  type="button"
                  className="booking-sheet-close"
                  aria-label="Close booking form"
                  onClick={closeBooking}
                >
                  <span aria-hidden="true">×</span>
                </button>
              </header>

              <div className="booking-sheet-animate">
                <BookingForm key={service} initialService={service} variant="sheet" />
              </div>
            </div>
          </GlassSurface>
        </aside>
      </div>
    </div>
  )
}

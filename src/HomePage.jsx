import { useEffect, useRef, useState } from 'react'
import Shuffle from './Shuffle'
import SideRays from './SideRays'
import SiteLayout from './SiteLayout'
import BookMark from './BookMark'
import { SERVICES } from './siteData'

function useReveal() {
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target) }
      }),
      { threshold: 0.16 }
    )
    document.querySelectorAll('.reveal').forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])
}

function useParallax(ref, factor = 0.2) {
  useEffect(() => {
    let raf = 0
    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        if (ref.current) ref.current.style.transform = `translateY(${window.scrollY * factor}px) scale(1.12)`
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [ref, factor])
}

const STRIP_LOOP_SETS = 10

function Strip({ items }) {
  const wrapRef = useRef(null)
  const trackRef = useRef(null)
  const offset = useRef(0)
  const half = useRef(1)
  const drag = useRef({ active: false, startX: 0, startOffset: 0, moved: false })
  const loop = Array.from({ length: STRIP_LOOP_SETS }, () => items).flat()

  const measure = () => {
    const track = trackRef.current
    if (!track) return
    half.current = track.scrollWidth / 2 || 1
  }

  useEffect(() => {
    const track = trackRef.current
    if (!track) return

    measure()
    window.addEventListener('resize', measure)

    let raf = 0
    const AUTO = 0.4
    const tick = () => {
      if (!drag.current.active) offset.current += AUTO
      const h = half.current
      offset.current = ((offset.current % h) + h) % h
      track.style.transform = `translate3d(${-offset.current}px,0,0)`
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    let lastY = window.scrollY
    const onPageScroll = () => {
      const dy = window.scrollY - lastY
      lastY = window.scrollY
      offset.current += dy * 0.6
    }
    window.addEventListener('scroll', onPageScroll, { passive: true })

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', onPageScroll)
    }
  }, [loop.length])

  useEffect(() => {
    measure()
    requestAnimationFrame(measure)
  }, [loop.length])

  useEffect(() => {
    const wrap = wrapRef.current
    const onDown = (e) => {
      drag.current = { active: true, startX: e.pageX, startOffset: offset.current, moved: false }
      wrap.classList.add('dragging')
    }
    const onMove = (e) => {
      if (!drag.current.active) return
      const dx = e.pageX - drag.current.startX
      if (Math.abs(dx) > 4) drag.current.moved = true
      offset.current = drag.current.startOffset - dx
    }
    const onUp = () => { drag.current.active = false; wrap.classList.remove('dragging') }
    const onWheel = (e) => { offset.current += (e.deltaX || e.deltaY) * 0.5 }
    wrap.addEventListener('pointerdown', onDown)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    wrap.addEventListener('wheel', onWheel, { passive: true })
    return () => {
      wrap.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      wrap.removeEventListener('wheel', onWheel)
    }
  }, [])

  return (
    <div className="strip" ref={wrapRef}>
      <div className="strip__track" ref={trackRef}>
        {loop.map((it, i) => (
          <div className="strip__item" key={i}>
            <div className="strip__txt">
              <h3>{it.title.toLowerCase()}</h3>
              <BookMark className="strip__book" service={it.title} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const SERVICE_VIZ = {
  Audio: {
    rayColor1: '#ec3b2b',
    rayColor2: '#f5c542',
    origin: 'top-right',
    speed: 2.8,
    intensity: 2.3,
    spread: 2.2,
    opacity: 0.9,
  },
  Production: {
    rayColor1: '#7c3aed',
    rayColor2: '#ec3b2b',
    origin: 'top-left',
    speed: 3.4,
    intensity: 2.5,
    spread: 1.8,
    opacity: 0.88,
  },
  Space: {
    rayColor1: '#96c8ff',
    rayColor2: '#efece6',
    origin: 'bottom-left',
    speed: 1.6,
    intensity: 1.7,
    spread: 2.6,
    opacity: 0.75,
  },
  Visual: {
    rayColor1: '#ec3b2b',
    rayColor2: '#49e9ff',
    origin: 'bottom-right',
    speed: 2.2,
    intensity: 2.1,
    spread: 2,
    opacity: 0.92,
  },
}

function ServiceRepeater({ service, align }) {
  const viz = SERVICE_VIZ[service.title]

  return (
    <article className={`service reveal service--${align}`} id={service.title.toLowerCase()}>
      <video className="service__bg" autoPlay muted loop playsInline poster="/assets/hero.jpg">
        <source src="/assets/header.mp4" type="video/mp4" />
      </video>
      <SideRays className="service__viz" {...viz} />
      <div className="service__shade" aria-hidden="true" />
      <div className="service__panel">
        <h2 className="service__title">{service.title.toLowerCase()}</h2>
        <BookMark className="service__book" service={service.title} />
      </div>
    </article>
  )
}

export default function HomePage() {
  const [loaded, setLoaded] = useState(false)
  const loaderLogoRef = useRef(null)
  const mediaRef = useRef(null)
  useReveal()
  useParallax(mediaRef, 0.18)

  useEffect(() => {
    const hash = window.location.hash.replace('#', '')
    if (!hash) return
    const t = window.setTimeout(() => {
      document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth' })
    }, 120)
    return () => window.clearTimeout(t)
  }, [])

  useEffect(() => {
    const logo = loaderLogoRef.current
    if (!logo) return

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const finish = () => {
      window.setTimeout(() => setLoaded(true), prefersReduced ? 100 : 380)
    }

    if (prefersReduced) {
      const t = window.setTimeout(finish, 450)
      return () => window.clearTimeout(t)
    }

    const onAnimationEnd = () => finish()
    logo.addEventListener('animationend', onAnimationEnd, { once: true })

    const fallback = window.setTimeout(finish, 3200)

    return () => {
      logo.removeEventListener('animationend', onAnimationEnd)
      window.clearTimeout(fallback)
    }
  }, [])

  return (
    <SiteLayout>
      <div className={`loader ${loaded ? 'done' : ''}`}>
        <img
          ref={loaderLogoRef}
          className="loader__logo"
          src="/assets/logo-chrome.png"
          alt="Only One Shot Studios"
        />
      </div>

      <header className="hero" id="home">
        <div className="hero__media" ref={mediaRef}>
          <video
            className="hero__video"
            autoPlay
            muted
            loop
            playsInline
            poster="/assets/hero.jpg"
          >
            <source src="/assets/header.mp4" type="video/mp4" />
          </video>
        </div>

        <div className="hero__center">
          <h1 className="hero__wordmark">
            <Shuffle
              tag="span"
              text="onlyoneshot"
              className="hero__shuffle"
              shuffleDirection="right"
              duration={0.35}
              animationMode="evenodd"
              shuffleTimes={2}
              ease="power3.out"
              stagger={0.03}
              threshold={0.1}
              triggerOnce
              triggerOnHover
              respectReducedMotion
            />
            <span className="hero__studio">studios</span>
          </h1>
        </div>

        <Strip items={SERVICES} />
      </header>

      <section id="services" className="services">
        {SERVICES.map((s, i) => (
          <ServiceRepeater key={s.n} service={s} align={i % 2 === 0 ? 'left' : 'right'} />
        ))}
      </section>

      <footer className="footer" id="contact">
        <img className="footer__logo" src="/assets/logo-chrome.png" alt="Only One Shot Studios" />
      </footer>
    </SiteLayout>
  )
}

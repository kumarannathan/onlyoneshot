import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { fetchPublicMedia } from './lib/portalApi'

const DEFAULTS = {
  hero: '/assets/header.mp4',
  audio: '/assets/header.mp4',
  production: '/assets/header.mp4',
  space: '/assets/header.mp4',
  visual: '/assets/header.mp4',
}

const SiteMediaContext = createContext(DEFAULTS)

export function notifyMediaUpdated() {
  window.dispatchEvent(new Event('portal-media-updated'))
}

export function SiteMediaProvider({ children }) {
  const [media, setMedia] = useState(DEFAULTS)
  const location = useLocation()

  const refresh = useCallback(() => {
    return fetchPublicMedia()
      .then((data) => setMedia({ ...DEFAULTS, ...data }))
      .catch(() => setMedia(DEFAULTS))
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh, location.pathname])

  useEffect(() => {
    const onUpdate = () => { refresh() }
    window.addEventListener('portal-media-updated', onUpdate)
    window.addEventListener('focus', onUpdate)
    return () => {
      window.removeEventListener('portal-media-updated', onUpdate)
      window.removeEventListener('focus', onUpdate)
    }
  }, [refresh])

  return (
    <SiteMediaContext.Provider value={media}>
      {children}
    </SiteMediaContext.Provider>
  )
}

export function useSiteMedia() {
  return useContext(SiteMediaContext)
}

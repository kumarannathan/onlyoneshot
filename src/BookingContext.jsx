import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

const BookingContext = createContext(null)

export function BookingProvider({ children }) {
  const [open, setOpen] = useState(false)
  const [service, setService] = useState('')
  const location = useLocation()
  const navigate = useNavigate()

  const openBooking = useCallback((nextService = '') => {
    setService(typeof nextService === 'string' ? nextService.toLowerCase() : '')
    setOpen(true)
  }, [])

  const closeBooking = useCallback(() => {
    setOpen(false)
  }, [])

  useEffect(() => {
    if (location.pathname !== '/') return
    if (location.hash.replace('#', '') !== 'book') return
    openBooking()
    navigate('/', { replace: true })
  }, [location.pathname, location.hash, openBooking, navigate])

  const value = useMemo(
    () => ({ open, service, openBooking, closeBooking }),
    [open, service, openBooking, closeBooking]
  )

  return (
    <BookingContext.Provider value={value}>
      {children}
    </BookingContext.Provider>
  )
}

export function useBooking() {
  const ctx = useContext(BookingContext)
  if (!ctx) throw new Error('useBooking must be used within BookingProvider')
  return ctx
}

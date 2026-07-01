import { useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import SiteLayout from './SiteLayout'
import BookingForm from './BookingForm'
import './BookingPage.css'
import './BookingModal.css'

export default function BookingPage() {
  const [searchParams] = useSearchParams()
  const initialService = searchParams.get('service')?.toLowerCase() ?? ''

  useEffect(() => {
    document.documentElement.style.scrollSnapType = 'none'
    document.body.style.scrollSnapType = 'none'
    return () => {
      document.documentElement.style.scrollSnapType = ''
      document.body.style.scrollSnapType = ''
    }
  }, [])

  return (
    <SiteLayout>
      <main className="booking">
        <div className="booking__inner wrap">
          <Link to="/" className="booking__back">← back</Link>

          <header className="booking__head">
            <h1 className="booking__title">book</h1>
            <p className="booking__lede">
              Tell us what you need — studio time, production, audio, or visual work.
              We&apos;ll get back to you within 24 hours.
            </p>
          </header>

          <div className="booking__form-wrap">
            <BookingForm initialService={initialService} variant="page" />
          </div>
        </div>
      </main>

      <footer className="footer">
        <img className="footer__logo" src="/assets/logo-chrome.png" alt="Only One Shot Studios" />
      </footer>
    </SiteLayout>
  )
}

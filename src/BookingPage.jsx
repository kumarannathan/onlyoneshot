import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import SiteLayout from './SiteLayout'
import { SERVICES } from './siteData'
import './BookingPage.css'

const EMPTY_FORM = {
  name: '',
  email: '',
  phone: '',
  date: '',
  service: '',
  message: '',
}

export default function BookingPage() {
  const [searchParams] = useSearchParams()
  const [form, setForm] = useState(EMPTY_FORM)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    document.documentElement.style.scrollSnapType = 'none'
    document.body.style.scrollSnapType = 'none'
    return () => {
      document.documentElement.style.scrollSnapType = ''
      document.body.style.scrollSnapType = ''
    }
  }, [])

  useEffect(() => {
    const service = searchParams.get('service')?.toLowerCase() ?? ''
    const match = SERVICES.find((s) => s.title.toLowerCase() === service)
    if (match) {
      setForm((prev) => ({ ...prev, service: match.title.toLowerCase() }))
    }
  }, [searchParams])

  const onChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const onSubmit = (e) => {
    e.preventDefault()
    setSubmitted(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

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

          {submitted ? (
            <div className="booking__success" role="status">
              <h2>request sent</h2>
              <p>Thanks {form.name || 'there'}. We&apos;ll reach out at {form.email} soon.</p>
              <Link to="/" className="booking__submit">back to home</Link>
            </div>
          ) : (
            <form className="booking__form" onSubmit={onSubmit}>
              <label className="booking__field">
                <span className="booking__label">service</span>
                <select name="service" value={form.service} onChange={onChange} required>
                  <option value="" disabled>Select a service</option>
                  {SERVICES.map((s) => (
                    <option key={s.n} value={s.title.toLowerCase()}>{s.title.toLowerCase()}</option>
                  ))}
                </select>
              </label>

              <div className="booking__row">
                <label className="booking__field">
                  <span className="booking__label">name</span>
                  <input name="name" type="text" autoComplete="name" value={form.name} onChange={onChange} required />
                </label>
                <label className="booking__field">
                  <span className="booking__label">email</span>
                  <input name="email" type="email" autoComplete="email" value={form.email} onChange={onChange} required />
                </label>
              </div>

              <div className="booking__row">
                <label className="booking__field">
                  <span className="booking__label">phone</span>
                  <input name="phone" type="tel" autoComplete="tel" value={form.phone} onChange={onChange} />
                </label>
                <label className="booking__field">
                  <span className="booking__label">preferred date</span>
                  <input name="date" type="date" value={form.date} onChange={onChange} />
                </label>
              </div>

              <label className="booking__field">
                <span className="booking__label">project details</span>
                <textarea
                  name="message"
                  rows={5}
                  placeholder="What are you working on? Any references, timeline, or budget?"
                  value={form.message}
                  onChange={onChange}
                  required
                />
              </label>

              <button type="submit" className="booking__submit">send request →</button>
            </form>
          )}
        </div>
      </main>

      <footer className="footer">
        <img className="footer__logo" src="/assets/logo-chrome.png" alt="Only One Shot Studios" />
      </footer>
    </SiteLayout>
  )
}

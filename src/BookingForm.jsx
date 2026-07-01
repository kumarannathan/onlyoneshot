import { useEffect, useState } from 'react'
import { SERVICES } from './siteData'

const EMPTY_FORM = {
  name: '',
  email: '',
  phone: '',
  date: '',
  service: '',
  message: '',
}

export default function BookingForm({
  initialService = '',
  variant = 'page',
  onSubmitted,
}) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    if (!initialService) return
    setForm((prev) => ({ ...prev, service: initialService.toLowerCase() }))
  }, [initialService])

  const onChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const onSubmit = (e) => {
    e.preventDefault()
    setSubmitted(true)
    onSubmitted?.(form)
  }

  const rootClass = variant === 'sheet' ? 'booking-form booking-form--sheet' : 'booking-form'

  if (submitted) {
    return (
      <div className={`${rootClass} booking-form--success`} role="status">
        <h2 className="booking-form__success-title">request sent</h2>
        <p className="booking-form__success-copy">
          Thanks {form.name || 'there'}. We&apos;ll reach out at {form.email} soon.
        </p>
      </div>
    )
  }

  return (
    <form className={rootClass} onSubmit={onSubmit}>
      <label className="booking-form__field">
        <span className="booking-form__label">service</span>
        <select name="service" value={form.service} onChange={onChange} required>
          <option value="" disabled>Select a service</option>
          {SERVICES.map((s) => (
            <option key={s.n} value={s.title.toLowerCase()}>{s.title.toLowerCase()}</option>
          ))}
        </select>
      </label>

      <div className="booking-form__row">
        <label className="booking-form__field">
          <span className="booking-form__label">name</span>
          <input name="name" type="text" autoComplete="name" value={form.name} onChange={onChange} required />
        </label>
        <label className="booking-form__field">
          <span className="booking-form__label">email</span>
          <input name="email" type="email" autoComplete="email" value={form.email} onChange={onChange} required />
        </label>
      </div>

      <div className="booking-form__row">
        <label className="booking-form__field">
          <span className="booking-form__label">phone</span>
          <input name="phone" type="tel" autoComplete="tel" value={form.phone} onChange={onChange} />
        </label>
        <label className="booking-form__field">
          <span className="booking-form__label">preferred date</span>
          <input name="date" type="date" value={form.date} onChange={onChange} />
        </label>
      </div>

      <label className="booking-form__field">
        <span className="booking-form__label">project details</span>
        <textarea
          name="message"
          rows={variant === 'sheet' ? 2 : 5}
          placeholder="What are you working on? Any references, timeline, or budget?"
          value={form.message}
          onChange={onChange}
          required
        />
      </label>

      <button type="submit" className="booking-form__submit">send</button>
    </form>
  )
}

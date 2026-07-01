import { useBooking } from './BookingContext'

export default function BookMark({ className = '', service = '' }) {
  const { openBooking } = useBooking()

  return (
    <button
      type="button"
      className={`book-mark ${className}`.trim()}
      onClick={() => openBooking(service)}
    >
      <span className="book-mark__label">book</span>
      <span className="book-mark__arrow" aria-hidden="true">→</span>
    </button>
  )
}

import { Link } from 'react-router-dom'

export default function BookMark({ className = '', service = '' }) {
  const to = service
    ? `/book?service=${encodeURIComponent(service.toLowerCase())}`
    : '/book'

  return (
    <Link to={to} className={`book-mark ${className}`.trim()}>
      <span className="book-mark__label">book</span>
      <span className="book-mark__arrow" aria-hidden="true">→</span>
    </Link>
  )
}

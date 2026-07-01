import { BrowserRouter, Routes, Route } from 'react-router-dom'
import HomePage from './HomePage'
import BookingPage from './BookingPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/book" element={<BookingPage />} />
      </Routes>
    </BrowserRouter>
  )
}

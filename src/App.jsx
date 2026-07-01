import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { SiteMediaProvider } from './SiteMediaContext'
import { BookingProvider } from './BookingContext'
import HomePage from './HomePage'
import BookingPage from './BookingPage'
import MembersPage from './MembersPage'

export default function App() {
  return (
    <BrowserRouter>
      <SiteMediaProvider>
        <BookingProvider>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/book" element={<BookingPage />} />
            <Route path="/members" element={<MembersPage />} />
          </Routes>
        </BookingProvider>
      </SiteMediaProvider>
    </BrowserRouter>
  )
}

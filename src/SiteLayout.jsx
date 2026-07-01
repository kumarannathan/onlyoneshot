import { Link } from 'react-router-dom'
import CircularText from './CircularText'
import StaggeredMenu from './StaggeredMenu'
import { MENU_ITEMS, SOCIAL_ITEMS } from './siteData'

export default function SiteLayout({ children }) {
  return (
    <>
      <div className="grain" />
      <div className="vignette" />

      <StaggeredMenu
        position="right"
        isFixed
        items={MENU_ITEMS}
        socialItems={SOCIAL_ITEMS}
        displaySocials
        socialsUnderLabel="Contact"
        displayItemNumbering={false}
        colors={['#ec3b2b', '#111111']}
        menuButtonColor="#f5f1ec"
        openMenuButtonColor="#0a0909"
        changeMenuColorOnOpen
        accentColor="#ec3b2b"
        logoUrl="/assets/logo-chrome.png"
        closeOnClickAway
      />

      <div className="badge badge--sticky">
        <Link to="/" className="badge__link" aria-label="Only One Shot Studios home">
          <CircularText
            text="only✦one✦shot✦studios✦"
            onHover="speedUp"
            spinDuration={20}
            className="hero__badge"
          />
          <div className="badge__emblem" aria-hidden="true" />
        </Link>
      </div>

      {children}
    </>
  )
}

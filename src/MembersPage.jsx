import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import GlassSurface from './GlassSurface'
import SiteLayout from './SiteLayout'
import {
  checkPortalHealth,
  fetchAdminMedia,
  inspectVideoFile,
  loginPortal,
  logoutPortal,
  uploadMediaToSections,
  assignMediaToSections,
  removeSlotMedia,
  validatePortalSession,
} from './lib/portalApi'
import { notifyMediaUpdated } from './SiteMediaContext'
import './MembersPage.css'

const MAX_CLIP = 10

const SECTION_OPTIONS = [
  { id: 'hero', label: 'Hero' },
  { id: 'audio', label: 'Audio' },
  { id: 'production', label: 'Production' },
  { id: 'space', label: 'Space' },
  { id: 'visual', label: 'Visual' },
]

function formatSeconds(n) {
  return `${Number(n || 0).toFixed(1)}s`
}

function defaultApplyMap() {
  return Object.fromEntries(SECTION_OPTIONS.map((s) => [s.id, [s.id]]))
}

function ApplyToSelector({ slotId, selected, onToggle, disabled }) {
  return (
    <div className="members__apply">
      <span className="members__apply-label">apply to:</span>
      <div className="members__apply-options" role="group" aria-label={`Apply ${slotId} video to sections`}>
        {SECTION_OPTIONS.map((section) => {
          const active = selected.includes(section.id)
          return (
            <button
              key={section.id}
              type="button"
              className={`members__apply-chip${active ? ' members__apply-chip--active' : ''}`}
              aria-pressed={active}
              disabled={disabled}
              onClick={() => onToggle(section.id)}
            >
              {section.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function MembersGlassCard({ children, className = '' }) {
  return (
    <div className={`members__shell ${className}`.trim()}>
      <GlassSurface
        width="100%"
        height="100%"
        borderRadius={24}
        brightness={42}
        opacity={0.9}
        blur={14}
        backgroundOpacity={0.1}
        saturation={1.65}
        className="members__glass"
      >
        {children}
      </GlassSurface>
    </div>
  )
}

export default function MembersPage() {
  const [authed, setAuthed] = useState(false)
  const [checking, setChecking] = useState(true)
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [admin, setAdmin] = useState(null)
  const [busySlot, setBusySlot] = useState('')
  const [message, setMessage] = useState('')
  const [apiOnline, setApiOnline] = useState(true)
  const [applyMap, setApplyMap] = useState(defaultApplyMap)

  const loadAdmin = async () => {
    const data = await fetchAdminMedia()
    setAdmin(data)
  }

  useEffect(() => {
    document.documentElement.style.scrollSnapType = 'none'
    document.body.style.scrollSnapType = 'none'
    checkPortalHealth().then(setApiOnline)
    validatePortalSession().then((ok) => {
      setAuthed(ok)
      setChecking(false)
      if (ok) loadAdmin().catch((err) => setMessage(err.message || 'Could not load media settings'))
    })
    return () => {
      document.documentElement.style.scrollSnapType = ''
      document.body.style.scrollSnapType = ''
    }
  }, [])

  const onLogin = async (e) => {
    e.preventDefault()
    setLoginError('')
    try {
      await loginPortal(password)
      setAuthed(true)
      setPassword('')
      await loadAdmin()
    } catch (err) {
      setLoginError(err.message || 'Invalid password')
    }
  }

  const onLogout = async () => {
    await logoutPortal()
    setAuthed(false)
    setAdmin(null)
  }

  const toggleApplyTarget = (cardSlotId, targetId) => {
    setApplyMap((prev) => {
      const current = new Set(prev[cardSlotId] || [cardSlotId])
      if (current.has(targetId)) current.delete(targetId)
      else current.add(targetId)
      if (current.size === 0) current.add(cardSlotId)
      return { ...prev, [cardSlotId]: [...current] }
    })
  }

  const formatSectionList = (ids) => {
    return ids
      .map((id) => SECTION_OPTIONS.find((s) => s.id === id)?.label || id)
      .join(', ')
  }

  const onUpload = async (slotId, file) => {
    if (!file) return
    const targets = applyMap[slotId]?.length ? applyMap[slotId] : [slotId]
    setBusySlot(slotId)
    setMessage('')
    try {
      const meta = await inspectVideoFile(file)
      const result = await uploadMediaToSections(targets, file)
      await loadAdmin()
      notifyMediaUpdated()
      const trimmedNote = result.trimmed ? ' (trimmed to 10s)' : ''
      const ratioNote = meta.is169 ? '' : ' · padded to 16:9 on save'
      setMessage(`Applied to ${formatSectionList(result.sections || targets)}${trimmedNote}${ratioNote}`)
    } catch (err) {
      setMessage(err.message || 'Upload failed')
    } finally {
      setBusySlot('')
    }
  }

  const onApplyExisting = async (slotId) => {
    const targets = applyMap[slotId]?.length ? applyMap[slotId] : [slotId]
    setBusySlot(slotId)
    setMessage('')
    try {
      const result = await assignMediaToSections(slotId, targets)
      await loadAdmin()
      notifyMediaUpdated()
      setMessage(`Applied current video to ${formatSectionList(result.targets || targets)}`)
    } catch (err) {
      setMessage(err.message || 'Apply failed')
    } finally {
      setBusySlot('')
    }
  }

  const onRemove = async (slotId) => {
    setBusySlot(slotId)
    setMessage('')
    try {
      await removeSlotMedia(slotId)
      await loadAdmin()
      notifyMediaUpdated()
      setMessage(`Cleared ${slotId} — site will use default video`)
    } catch (err) {
      setMessage(err.message || 'Remove failed')
    } finally {
      setBusySlot('')
    }
  }

  return (
    <SiteLayout>
      <main className="members">
        <div className="members__inner wrap">
          <Link to="/" className="members__back">← back</Link>

          {checking ? (
            <p className="members__status">checking access…</p>
          ) : !authed ? (
            <MembersGlassCard className="members__shell--gate">
              <section className="members__gate">
                <h1 className="members__title">members</h1>
                <p className="members__lede">Enter the studio password to manage hero and service videos.</p>
                <form className="members__login" onSubmit={onLogin}>
                  <label className="members__field">
                    <span className="members__label">password</span>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="current-password"
                      required
                    />
                  </label>
                  {loginError && <p className="members__error" role="alert">{loginError}</p>}
                  <button type="submit" className="members__btn">enter portal</button>
                </form>
              </section>
            </MembersGlassCard>
          ) : (
            <MembersGlassCard className="members__shell--panel">
              <section className="members__panel">
              <div className="members__top">
                <div>
                  <h1 className="members__title">media portal</h1>
                  <p className="members__lede">
                    Upload loop clips for the hero and each service tile. Recommended <strong>16:9</strong> MP4/MOV/WebM.
                    Long clips are auto-trimmed to <strong>{MAX_CLIP}s</strong> ({admin?.maxTotalSeconds ?? 40}s total max).
                    Use <strong>apply to</strong> to push one clip to multiple sections — shared clips count once toward the budget.
                  </p>
                </div>
                <button type="button" className="members__btn members__btn--ghost" onClick={onLogout}>
                  log out
                </button>
              </div>

              {!apiOnline && (
                <p className="members__error" role="alert">
                  Upload server offline — run <code>npm run dev</code> and reload this page.
                </p>
              )}

              {admin && (
                <p className="members__budget">
                  total used: {formatSeconds(admin.totalDurationSeconds)} / {admin.maxTotalSeconds}s
                </p>
              )}

              {message && <p className="members__message" role="status">{message}</p>}

              <div className="members__grid">
                {admin?.slots.map((slot) => {
                  const selected = applyMap[slot.slotId] || [slot.slotId]
                  const busy = busySlot === slot.slotId
                  const canApplyExisting = Boolean(slot.url) && selected.length > 0

                  return (
                    <article
                      key={slot.slotId}
                      className={`members__card${slot.slotId === 'hero' ? ' members__card--hero' : ''}`}
                    >
                      <div className="members__card-head">
                        <h2>{slot.label}</h2>
                        <span className="members__ratio">16:9 · max {MAX_CLIP}s</span>
                      </div>

                      <div className="members__preview members__preview--169">
                        {slot.url ? (
                          <video src={slot.url} muted loop playsInline autoPlay />
                        ) : (
                          <div className="members__preview-empty">default site video</div>
                        )}
                      </div>

                      <p className="members__meta">
                        {slot.durationSeconds
                          ? `${formatSeconds(slot.durationSeconds)} uploaded`
                          : 'no custom upload'}
                      </p>

                      <ApplyToSelector
                        slotId={slot.slotId}
                        selected={selected}
                        disabled={busy}
                        onToggle={(targetId) => toggleApplyTarget(slot.slotId, targetId)}
                      />

                      <div className="members__actions">
                        <label className="members__upload">
                          <input
                            type="file"
                            accept="video/*"
                            disabled={busy}
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              e.target.value = ''
                              if (file) onUpload(slot.slotId, file)
                            }}
                          />
                          {busy ? 'uploading…' : 'upload video'}
                        </label>
                        {canApplyExisting && (
                          <button
                            type="button"
                            className="members__btn members__btn--ghost"
                            disabled={busy}
                            onClick={() => onApplyExisting(slot.slotId)}
                          >
                            apply
                          </button>
                        )}
                        {slot.url && (
                          <button
                            type="button"
                            className="members__btn members__btn--ghost"
                            disabled={busy}
                            onClick={() => onRemove(slot.slotId)}
                          >
                            reset
                          </button>
                        )}
                      </div>
                    </article>
                  )
                })}
              </div>
              </section>
            </MembersGlassCard>
          )}
        </div>
      </main>
    </SiteLayout>
  )
}

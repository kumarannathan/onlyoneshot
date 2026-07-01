const TOKEN_KEY = 'portal_token'

export function getPortalToken() {
  return sessionStorage.getItem(TOKEN_KEY)
}

export function setPortalToken(token) {
  sessionStorage.setItem(TOKEN_KEY, token)
}

export function clearPortalToken() {
  sessionStorage.removeItem(TOKEN_KEY)
}

async function apiFetch(path, options = {}) {
  const headers = new Headers(options.headers || {})
  const token = getPortalToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)

  if (options.body instanceof FormData) {
    headers.delete('Content-Type')
  }

  let res
  try {
    res = await fetch(path, { ...options, headers })
  } catch {
    throw new Error('Upload server is not running. Use npm run dev and try again.')
  }

  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`)
  return data
}

export async function checkPortalHealth() {
  try {
    const res = await fetch('/api/health')
    return res.ok
  } catch {
    return false
  }
}

export async function loginPortal(password) {
  const data = await apiFetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  })
  setPortalToken(data.token)
  return data
}

export async function validatePortalSession() {
  const token = getPortalToken()
  if (!token) return false
  try {
    await apiFetch('/api/auth/session')
    return true
  } catch {
    clearPortalToken()
    return false
  }
}

export async function logoutPortal() {
  try {
    await apiFetch('/api/auth/logout', { method: 'POST' })
  } finally {
    clearPortalToken()
  }
}

export async function fetchPublicMedia() {
  let res
  try {
    res = await fetch('/api/media', { cache: 'no-store' })
  } catch {
    throw new Error('Media server is not running. Use npm run dev or npm start.')
  }
  if (!res.ok) throw new Error('Failed to load site media')
  return res.json()
}

export async function fetchAdminMedia() {
  return apiFetch('/api/media/admin')
}

export async function uploadSlotMedia(slotId, file) {
  return uploadMediaToSections([slotId], file)
}

export async function uploadMediaToSections(sections, file) {
  const form = new FormData()
  form.append('video', file)
  form.append('sections', JSON.stringify(sections))
  return apiFetch('/api/media/batch', { method: 'POST', body: form })
}

export async function assignMediaToSections(sourceSlot, targets) {
  return apiFetch('/api/media/assign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sourceSlot, targets }),
  })
}

export async function removeSlotMedia(slotId) {
  return apiFetch(`/api/media/${slotId}`, { method: 'DELETE' })
}

export function inspectVideoFile(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.muted = true
    video.playsInline = true

    const finish = () => {
      const duration = video.duration
      const width = video.videoWidth
      const height = video.videoHeight
      URL.revokeObjectURL(url)
      if (!Number.isFinite(duration) || duration <= 0) {
        reject(new Error('Could not read video duration'))
        return
      }
      const ratio = width / height
      resolve({
        duration,
        width,
        height,
        ratio,
        is169: Math.abs(ratio - 16 / 9) < 0.12,
      })
    }

    video.onloadedmetadata = finish
    video.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not read video metadata'))
    }
    video.src = url
    video.load()
  })
}

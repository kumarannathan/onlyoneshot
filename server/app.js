import express from 'express'
import cors from 'cors'
import multer from 'multer'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import {
  MEDIA_SLOTS,
  getAllMedia,
  getMediaBySlot,
  updateMediaSlot,
  getTotalDuration,
  clearMediaSlot,
  countSlotsUsingFile,
  assignFileToSlot,
  projectedDurationAfterUpdate,
} from './db.js'
import { isVideoUpload, processVideo, probeVideo, safeUnlink } from './video.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.join(__dirname, '..')
const uploadsDir = path.join(__dirname, 'uploads')
const distDir = path.join(rootDir, 'dist')

const MAX_CLIP_SECONDS = 10
const MAX_TOTAL_SECONDS = 40
const MAX_FILE_BYTES = 120 * 1024 * 1024

const VALID_SLOTS = new Set(MEDIA_SLOTS.map((s) => s.id))

export function createPortalApp({ serveStatic = false } = {}) {
  const sessions = new Map()
  const MEMBER_PASSWORD = process.env.MEMBER_PASSWORD || 'tortapounder'

  fs.mkdirSync(uploadsDir, { recursive: true })

  const app = express()
  app.use(cors({ origin: true, credentials: true }))
  app.use(express.json())
  app.use('/uploads', express.static(uploadsDir))

  const storage = multer.diskStorage({
    destination: uploadsDir,
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase() || '.mp4'
      cb(null, `incoming-${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`)
    },
  })

  const upload = multer({
    storage,
    limits: { fileSize: MAX_FILE_BYTES },
    fileFilter: (_req, file, cb) => {
      if (isVideoUpload(file)) {
        cb(null, true)
        return
      }
      cb(new Error('Only video files are allowed (.mp4, .mov, .webm)'))
    },
  })

  function checkPassword(input, expected) {
    const inputHash = crypto.createHash('sha256').update(input).digest()
    const expectedHash = crypto.createHash('sha256').update(expected).digest()
    return crypto.timingSafeEqual(inputHash, expectedHash)
  }

  function createToken() {
    const token = crypto.randomBytes(32).toString('hex')
    sessions.set(token, Date.now() + 12 * 60 * 60 * 1000)
    return token
  }

  function authRequired(req, res, next) {
    const header = req.headers.authorization || ''
    const token = header.startsWith('Bearer ') ? header.slice(7) : ''
    const expires = sessions.get(token)
    if (!expires || Date.now() > expires) {
      if (token) sessions.delete(token)
      res.status(401).json({ error: 'Unauthorized' })
      return
    }
    sessions.set(token, Date.now() + 12 * 60 * 60 * 1000)
    req.authToken = token
    next()
  }

  function toPublicRow(row) {
    const version = row.updated_at ? `?v=${encodeURIComponent(row.updated_at)}` : ''
    return {
      slotId: row.slot_id,
      label: row.label,
      url: row.file_name ? `/uploads/${row.file_name}${version}` : null,
      durationSeconds: row.duration_seconds,
      updatedAt: row.updated_at,
    }
  }

  function defaultMediaResponse() {
    const defaults = {
      hero: '/assets/header.mp4',
      audio: '/assets/header.mp4',
      production: '/assets/header.mp4',
      space: '/assets/header.mp4',
      visual: '/assets/header.mp4',
    }
    const rows = getAllMedia()
    const out = { ...defaults }
    for (const row of rows) {
      if (row.file_name) {
        const version = row.updated_at ? `?v=${encodeURIComponent(row.updated_at)}` : ''
        out[row.slot_id] = `/uploads/${row.file_name}${version}`
      }
    }
    return out
  }

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true })
  })

  app.post('/api/auth/login', (req, res) => {
    const password = String(req.body?.password ?? '')
    if (!checkPassword(password, MEMBER_PASSWORD)) {
      res.status(401).json({ error: 'Invalid password' })
      return
    }
    res.json({ token: createToken() })
  })

  app.post('/api/auth/logout', authRequired, (req, res) => {
    sessions.delete(req.authToken)
    res.json({ ok: true })
  })

  app.get('/api/auth/session', authRequired, (_req, res) => {
    res.json({ ok: true })
  })

  app.get('/api/media', (_req, res) => {
    res.json(defaultMediaResponse())
  })

  app.get('/api/media/admin', authRequired, (_req, res) => {
    const rows = getAllMedia().map(toPublicRow)
    res.json({
      slots: rows,
      totalDurationSeconds: getTotalDuration(),
      maxClipSeconds: MAX_CLIP_SECONDS,
      maxTotalSeconds: MAX_TOTAL_SECONDS,
      aspectRatio: '16:9',
    })
  })

  function parseSectionList(raw) {
    if (Array.isArray(raw)) return raw.map(String)
    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) return parsed.map(String)
      } catch {
        return raw.split(',').map((s) => s.trim()).filter(Boolean)
      }
    }
    return []
  }

  function normalizeSections(sections) {
    const unique = [...new Set(sections.filter((id) => VALID_SLOTS.has(id)))]
    return unique
  }

  function reclaimFileIfUnused(fileName, keepName) {
    if (!fileName || fileName === keepName) return
    if (countSlotsUsingFile(fileName) === 0) {
      safeUnlink(path.join(uploadsDir, fileName))
    }
  }

  async function processUploadToFile(incomingPath, outName) {
    const source = await probeVideo(incomingPath)
    const clipDuration = Math.min(source.duration, MAX_CLIP_SECONDS)
    const outPath = path.join(uploadsDir, outName)
    const processed = await processVideo(incomingPath, outPath, MAX_CLIP_SECONDS)
    safeUnlink(incomingPath)
    const storedDuration = Math.min(processed.duration, MAX_CLIP_SECONDS)
    return {
      outName,
      storedDuration,
      trimmed: source.duration > MAX_CLIP_SECONDS + 0.05,
    }
  }

  app.post('/api/media/batch', authRequired, (req, res) => {
    upload.single('video')(req, res, async (err) => {
      const cleanup = () => {
        if (req.file?.path) safeUnlink(req.file.path)
      }

      if (err) {
        cleanup()
        if (err instanceof multer.MulterError) {
          res.status(400).json({ error: err.code === 'LIMIT_FILE_SIZE' ? 'File is too large (max 120MB source file)' : err.message })
          return
        }
        res.status(400).json({ error: err.message || 'Upload failed' })
        return
      }

      const sections = normalizeSections(parseSectionList(req.body?.sections))
      if (!sections.length) {
        cleanup()
        res.status(400).json({ error: 'Select at least one section to apply this video to' })
        return
      }

      if (!req.file) {
        res.status(400).json({ error: 'Video file is required' })
        return
      }

      const incomingPath = req.file.path
      const outName = `clip-${Date.now()}.mp4`
      const oldFiles = new Set()

      try {
        for (const slotId of sections) {
          const current = getMediaBySlot(slotId)
          if (current?.file_name) oldFiles.add(current.file_name)
        }

        const source = await probeVideo(incomingPath)
        const clipDuration = Math.min(source.duration, MAX_CLIP_SECONDS)
        const projected = projectedDurationAfterUpdate(sections, outName, clipDuration)
        if (projected > MAX_TOTAL_SECONDS + 0.05) {
          throw new Error(
            `Total site video budget is ${MAX_TOTAL_SECONDS} seconds (shared clips count once)`
          )
        }

        const processed = await processUploadToFile(incomingPath, outName)

        for (const slotId of sections) {
          assignFileToSlot(slotId, processed.outName, processed.storedDuration)
        }

        for (const oldFile of oldFiles) {
          reclaimFileIfUnused(oldFile, processed.outName)
        }

        res.json({
          ok: true,
          sections,
          slots: sections.map((slotId) => toPublicRow(getMediaBySlot(slotId))),
          totalDurationSeconds: getTotalDuration(),
          trimmed: processed.trimmed,
          normalized: true,
        })
      } catch (processErr) {
        safeUnlink(incomingPath)
        safeUnlink(path.join(uploadsDir, outName))
        res.status(400).json({ error: processErr.message || 'Could not process video' })
      }
    })
  })

  app.post('/api/media/assign', authRequired, (req, res) => {
    const sourceSlot = String(req.body?.sourceSlot ?? '')
    const targets = normalizeSections(parseSectionList(req.body?.targets))

    if (!VALID_SLOTS.has(sourceSlot)) {
      res.status(400).json({ error: 'Invalid source section' })
      return
    }
    if (!targets.length) {
      res.status(400).json({ error: 'Select at least one section to apply this video to' })
      return
    }

    const source = getMediaBySlot(sourceSlot)
    if (!source?.file_name || source.duration_seconds == null) {
      res.status(400).json({ error: 'Upload a video to this section first' })
      return
    }

    const oldFiles = new Set()
    for (const slotId of targets) {
      const current = getMediaBySlot(slotId)
      if (current?.file_name && current.file_name !== source.file_name) {
        oldFiles.add(current.file_name)
      }
    }

    for (const slotId of targets) {
      assignFileToSlot(slotId, source.file_name, source.duration_seconds)
    }

    for (const oldFile of oldFiles) {
      reclaimFileIfUnused(oldFile, source.file_name)
    }

    res.json({
      ok: true,
      sourceSlot,
      targets,
      slots: targets.map((slotId) => toPublicRow(getMediaBySlot(slotId))),
      totalDurationSeconds: getTotalDuration(),
    })
  })

  app.post('/api/media/:slot', authRequired, (req, res) => {
    upload.single('video')(req, res, async (err) => {
      const cleanup = () => {
        if (req.file?.path) safeUnlink(req.file.path)
      }

      if (err) {
        cleanup()
        if (err instanceof multer.MulterError) {
          res.status(400).json({ error: err.code === 'LIMIT_FILE_SIZE' ? 'File is too large (max 120MB source file)' : err.message })
          return
        }
        res.status(400).json({ error: err.message || 'Upload failed' })
        return
      }

      const slotId = req.params.slot
      if (!VALID_SLOTS.has(slotId)) {
        cleanup()
        res.status(400).json({ error: 'Invalid media slot' })
        return
      }

      if (!req.file) {
        res.status(400).json({ error: 'Video file is required' })
        return
      }

      const incomingPath = req.file.path
      const outName = `${slotId}-${Date.now()}.mp4`
      const outPath = path.join(uploadsDir, outName)

      try {
        const source = await probeVideo(incomingPath)
        const clipDuration = Math.min(source.duration, MAX_CLIP_SECONDS)

        const current = getMediaBySlot(slotId)
        const oldFile = current?.file_name
        const projected = projectedDurationAfterUpdate([slotId], outName, clipDuration)
        if (projected > MAX_TOTAL_SECONDS + 0.05) {
          throw new Error(
            `Total site video budget is ${MAX_TOTAL_SECONDS} seconds (shared clips count once)`
          )
        }

        const processed = await processVideo(incomingPath, outPath, MAX_CLIP_SECONDS)
        safeUnlink(incomingPath)

        const storedDuration = Math.min(processed.duration, MAX_CLIP_SECONDS)

        updateMediaSlot(slotId, outName, storedDuration)
        reclaimFileIfUnused(oldFile, outName)
        res.json({
          ok: true,
          slot: toPublicRow(getMediaBySlot(slotId)),
          totalDurationSeconds: getTotalDuration(),
          trimmed: source.duration > MAX_CLIP_SECONDS + 0.05,
          normalized: true,
        })
      } catch (processErr) {
        safeUnlink(incomingPath)
        safeUnlink(outPath)
        res.status(400).json({ error: processErr.message || 'Could not process video' })
      }
    })
  })

  app.delete('/api/media/:slot', authRequired, (req, res) => {
    const slotId = req.params.slot
    if (!VALID_SLOTS.has(slotId)) {
      res.status(400).json({ error: 'Invalid media slot' })
      return
    }
    const current = getMediaBySlot(slotId)
    const oldFile = current?.file_name
    clearMediaSlot(slotId)
    reclaimFileIfUnused(oldFile)
    res.json({ ok: true, totalDurationSeconds: getTotalDuration() })
  })

  if (serveStatic && fs.existsSync(distDir)) {
    app.use(express.static(distDir))
    app.get(/^(?!\/api|\/uploads).*/, (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'))
    })
  }

  app.use((err, _req, res, _next) => {
    if (err instanceof multer.MulterError) {
      res.status(400).json({ error: err.message })
      return
    }
    res.status(500).json({ error: err?.message || 'Server error' })
  })

  return app
}

import Database from 'better-sqlite3'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dataDir = path.join(__dirname, 'data')
const dbPath = path.join(dataDir, 'portal.db')

fs.mkdirSync(dataDir, { recursive: true })

const db = new Database(dbPath)

db.exec(`
  CREATE TABLE IF NOT EXISTS media_slots (
    slot_id TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    file_name TEXT,
    duration_seconds REAL,
    updated_at TEXT
  );
`)

export const MEDIA_SLOTS = [
  { id: 'hero', label: 'Hero section' },
  { id: 'audio', label: 'Audio' },
  { id: 'production', label: 'Production' },
  { id: 'space', label: 'Space' },
  { id: 'visual', label: 'Visual' },
]

const insertSlot = db.prepare(`
  INSERT OR IGNORE INTO media_slots (slot_id, label, file_name, duration_seconds, updated_at)
  VALUES (@slot_id, @label, NULL, NULL, NULL)
`)

for (const slot of MEDIA_SLOTS) {
  insertSlot.run({ slot_id: slot.id, label: slot.label })
}

export function getAllMedia() {
  return db.prepare(`
    SELECT slot_id, label, file_name, duration_seconds, updated_at
    FROM media_slots
    ORDER BY CASE slot_id
      WHEN 'hero' THEN 0
      WHEN 'audio' THEN 1
      WHEN 'production' THEN 2
      WHEN 'space' THEN 3
      WHEN 'visual' THEN 4
      ELSE 5
    END
  `).all()
}

export function getMediaBySlot(slotId) {
  return db.prepare(`
    SELECT slot_id, label, file_name, duration_seconds, updated_at
    FROM media_slots WHERE slot_id = ?
  `).get(slotId)
}

export function updateMediaSlot(slotId, fileName, durationSeconds) {
  db.prepare(`
    UPDATE media_slots
    SET file_name = ?, duration_seconds = ?, updated_at = ?
    WHERE slot_id = ?
  `).run(fileName, durationSeconds, new Date().toISOString(), slotId)
}

export function getTotalDuration() {
  const rows = db.prepare(`
    SELECT file_name, duration_seconds
    FROM media_slots
    WHERE file_name IS NOT NULL AND duration_seconds IS NOT NULL
  `).all()
  const seen = new Set()
  let total = 0
  for (const row of rows) {
    if (seen.has(row.file_name)) continue
    seen.add(row.file_name)
    total += row.duration_seconds
  }
  return total
}

export function countSlotsUsingFile(fileName) {
  if (!fileName) return 0
  const row = db.prepare(`
    SELECT COUNT(*) AS count
    FROM media_slots
    WHERE file_name = ?
  `).get(fileName)
  return row?.count ?? 0
}

export function assignFileToSlot(slotId, fileName, durationSeconds) {
  db.prepare(`
    UPDATE media_slots
    SET file_name = ?, duration_seconds = ?, updated_at = ?
    WHERE slot_id = ?
  `).run(fileName, durationSeconds, new Date().toISOString(), slotId)
}

export function projectedDurationAfterUpdate(slotsToReplace, newFileName, newDuration) {
  const rows = getAllMedia()
  const uniqueFiles = new Map()

  for (const row of rows) {
    if (!row.file_name || row.duration_seconds == null) continue
    if (slotsToReplace.includes(row.slot_id)) continue
    uniqueFiles.set(row.file_name, row.duration_seconds)
  }

  if (newFileName && newDuration != null) {
    uniqueFiles.set(newFileName, newDuration)
  }

  let total = 0
  for (const duration of uniqueFiles.values()) {
    total += duration
  }
  return total
}

export function clearMediaSlot(slotId) {
  db.prepare(`
    UPDATE media_slots
    SET file_name = NULL, duration_seconds = NULL, updated_at = ?
    WHERE slot_id = ?
  `).run(new Date().toISOString(), slotId)
}

export default db

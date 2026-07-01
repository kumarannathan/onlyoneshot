import fs from 'fs'
import path from 'path'
import { execFile } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

export async function probeVideo(filePath) {
  const { stdout } = await execFileAsync('ffprobe', [
    '-v',
    'error',
    '-select_streams',
    'v:0',
    '-show_entries',
    'stream=width,height,duration',
    '-of',
    'json',
    filePath,
  ])
  const data = JSON.parse(stdout)
  const stream = data.streams?.[0]
  if (!stream) throw new Error('No video stream found in file')
  return {
    width: Number(stream.width),
    height: Number(stream.height),
    duration: Number(stream.duration),
  }
}

export async function processVideo(inputPath, outputPath, maxSeconds = 10) {
  await execFileAsync('ffmpeg', [
    '-y',
    '-i',
    inputPath,
    '-t',
    String(maxSeconds),
    '-vf',
    'scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:black',
    '-c:v',
    'libx264',
    '-preset',
    'fast',
    '-crf',
    '23',
    '-pix_fmt',
    'yuv420p',
    '-an',
    '-movflags',
    '+faststart',
    outputPath,
  ])
  return probeVideo(outputPath)
}

export function safeUnlink(filePath) {
  if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath)
}

export function videoExtname(name) {
  return path.extname(name).toLowerCase()
}

export const VIDEO_EXTENSIONS = new Set(['.mp4', '.webm', '.mov', '.m4v', '.avi', '.mkv'])

export function isVideoUpload(file) {
  const ext = videoExtname(file.originalname)
  return file.mimetype.startsWith('video/') || VIDEO_EXTENSIONS.has(ext)
}

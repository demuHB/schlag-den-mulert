// Gemeinsame Helfer für build-data.mjs und restore.mjs:
// .env lesen, Schlüssel ableiten, AES-256-GCM ver-/entschlüsseln.
import { createCipheriv, createDecipheriv, createHash, pbkdf2Sync, randomBytes } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

export const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')
export const ENV_FILE = join(ROOT, '.env')
export const META_FILE = join(ROOT, 'public/data/meta.json')
export const VAULT_DIR = join(ROOT, 'vault')
export const ITERATIONS = 600_000

export function fail(msg) {
  console.error(`\n✖ ${msg}\n`)
  process.exit(1)
}

export function loadEnv() {
  if (!existsSync(ENV_FILE)) return
  for (const line of readFileSync(ENV_FILE, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/)
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2]
  }
}

const checksum = (key) => createHash('sha256').update(key).digest('base64')

/**
 * Leitet den Schlüssel aus dem Passwort ab. Passt das Passwort zur vorhandenen
 * meta.json, wird deren Salt weiterverwendet (keine unnötigen Diffs).
 * Sonst: `allowNew` → neues Salt (Passwortwechsel), andernfalls `null`.
 */
export function deriveKey(password, { allowNew = false } = {}) {
  if (existsSync(META_FILE)) {
    const meta = JSON.parse(readFileSync(META_FILE, 'utf8'))
    const salt = Buffer.from(meta.salt, 'base64')
    const key = pbkdf2Sync(password, salt, meta.iterations, 32, 'sha256')
    if (checksum(key) === meta.check) return { key, salt, changed: false }
  }
  if (!allowNew) return null
  const salt = randomBytes(16)
  return { key: pbkdf2Sync(password, salt, ITERATIONS, 32, 'sha256'), salt, changed: true }
}

export function metaJson(key, salt) {
  return JSON.stringify({ v: 1, iterations: ITERATIONS, salt: salt.toString('base64'), check: checksum(key) }, null, 2) + '\n'
}

/** Format: iv(12) | ciphertext | tag(16). IV aus dem Inhalt abgeleitet → gleiche Eingabe = gleiche Datei. */
export function encrypt(key, buf) {
  const iv = createHash('sha256').update(key).update(buf).digest().subarray(0, 12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  return Buffer.concat([iv, cipher.update(buf), cipher.final(), cipher.getAuthTag()])
}

export function decrypt(key, buf) {
  const decipher = createDecipheriv('aes-256-gcm', key, buf.subarray(0, 12))
  decipher.setAuthTag(buf.subarray(-16))
  return Buffer.concat([decipher.update(buf.subarray(12, -16)), decipher.final()])
}

export const shortHash = (buf, len = 20) => createHash('sha256').update(buf).digest('hex').slice(0, len)

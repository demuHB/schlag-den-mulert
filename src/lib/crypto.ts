// Entschlüsselt die mit scripts/build-data.mjs erzeugten Dateien (AES-256-GCM,
// Schlüssel per PBKDF2-SHA256 aus dem Passwort). Format: iv(12) | ciphertext | tag(16)

interface Meta {
  v: number
  iterations: number
  salt: string
}

const STORAGE_KEY = 'sdm-key'
const b64ToBytes = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0))
const bytesToB64 = (b: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(b)))

let metaPromise: Promise<Meta> | null = null
export function loadMeta() {
  metaPromise ??= fetch('./data/meta.json', { cache: 'no-cache' }).then((r) => {
    if (!r.ok) throw new Error('meta.json fehlt')
    return r.json()
  })
  return metaPromise
}

export async function deriveKey(password: string): Promise<CryptoKey> {
  const meta = await loadMeta()
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt: b64ToBytes(meta.salt), iterations: meta.iterations },
    base,
    { name: 'AES-GCM', length: 256 },
    true,
    ['decrypt'],
  )
}

export async function decrypt(key: CryptoKey, buf: ArrayBuffer): Promise<ArrayBuffer> {
  const bytes = new Uint8Array(buf)
  return crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes.subarray(0, 12) }, key, bytes.subarray(12))
}

export async function fetchDecrypted(key: CryptoKey, url: string): Promise<ArrayBuffer> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${url}: ${res.status}`)
  return decrypt(key, await res.arrayBuffer())
}

// ---- "angemeldet bleiben": abgeleiteter Schlüssel (nicht das Passwort) im localStorage ----
export async function rememberKey(key: CryptoKey) {
  const meta = await loadMeta()
  const raw = await crypto.subtle.exportKey('raw', key)
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ salt: meta.salt, key: bytesToB64(raw) }))
  } catch {
    /* privater Modus o. ä. – dann eben jedes Mal anmelden */
  }
}

export async function restoreKey(): Promise<CryptoKey | null> {
  let stored: { salt: string; key: string } | null = null
  try {
    stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
  } catch {
    return null
  }
  if (!stored) return null
  const meta = await loadMeta()
  // Passwort wurde geändert → alter Schlüssel ist wertlos
  if (stored.salt !== meta.salt) {
    forgetKey()
    return null
  }
  return crypto.subtle.importKey('raw', b64ToBytes(stored.key), 'AES-GCM', true, ['decrypt'])
}

export function forgetKey() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

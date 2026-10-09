// Stellt raw/ (Excel, Logo, Screenshots, Clips) aus den verschlüsselten
// Dateien im Repo wieder her – z. B. auf einem anderen PC nach `git clone`.
//
//   npm run restore            fragt bei Bedarf nach dem Passwort und legt .env an
//   npm run restore -- --force überschreibt auch lokal geänderte Dateien
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { createInterface } from 'node:readline/promises'
import { ENV_FILE, META_FILE, ROOT, VAULT_DIR, decrypt, deriveKey, fail, loadEnv } from './common.mjs'

const FORCE = process.argv.includes('--force')
const RAW_DIR = join(ROOT, 'raw')

if (!existsSync(META_FILE)) fail('public/data/meta.json fehlt – ist das Repo vollständig geklont?')

loadEnv()
let password = process.env.SDM_PASSWORD
let askedForPassword = false
if (!password) {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  password = (await rl.question('Dashboard-Passwort: ')).trim()
  rl.close()
  askedForPassword = true
}
const derived = password && deriveKey(password)
if (!derived) fail(askedForPassword ? 'Falsches Passwort.' : 'Passwort in .env passt nicht (wurde es geändert?) – SDM_PASSWORD in .env anpassen.')
const { key } = derived

if (askedForPassword) {
  const env = existsSync(ENV_FILE) ? readFileSync(ENV_FILE, 'utf8').replace(/\n?$/, '\n') : ''
  writeFileSync(ENV_FILE, `${env}SDM_PASSWORD=${password}\n`)
  console.log('✔ Passwort in .env gespeichert (wird nicht committet)')
}

const stats = { written: 0, same: 0, skipped: [] }
function restore(rel, buf) {
  const target = join(RAW_DIR, rel)
  if (existsSync(target)) {
    const current = readFileSync(target)
    if (current.equals(buf)) return void stats.same++
    if (!FORCE) return void stats.skipped.push(rel)
  }
  mkdirSync(dirname(target), { recursive: true })
  writeFileSync(target, buf)
  stats.written++
}

// Originale aus vault/
const indexFile = join(VAULT_DIR, 'index.enc')
if (existsSync(indexFile)) {
  const index = JSON.parse(decrypt(key, readFileSync(indexFile)).toString('utf8'))
  for (const { name, id } of index.files) restore(name, decrypt(key, readFileSync(join(VAULT_DIR, `${id}.enc`))))
} else {
  console.warn('⚠ vault/ fehlt – nur Medien werden wiederhergestellt')
}

// Medien aus public/media (Zuordnung steht im verschlüsselten Datensatz)
const data = JSON.parse(decrypt(key, readFileSync(join(ROOT, 'public/data/sdm.enc'))).toString('utf8'))
const mediaDir = join(ROOT, 'public/media')
const available = new Set(existsSync(mediaDir) ? readdirSync(mediaDir) : [])
for (const show of data.shows)
  for (const game of show.games)
    for (const m of game.media ?? []) {
      if (!available.has(`${m.id}.bin`)) continue
      const file = m.file ?? `spiel-${game.nr}-${m.id}.${m.type.split('/')[1]}`
      restore(join('media', `sdm-${show.number}`, file), decrypt(key, readFileSync(join(mediaDir, `${m.id}.bin`))))
    }

console.log(`\n✔ raw/ wiederhergestellt: ${stats.written} geschrieben, ${stats.same} bereits aktuell`)
if (stats.skipped.length) {
  console.warn(`⚠ ${stats.skipped.length} lokal abweichende Datei(en) NICHT überschrieben (mit --force erzwingen):`)
  for (const s of stats.skipped) console.warn(`  - raw/${s}`)
}

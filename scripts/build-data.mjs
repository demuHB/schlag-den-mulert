// Liest die SdM-Excel + Medien aus raw/, validiert alles und schreibt
// AES-GCM-verschlüsselte Dateien nach public/ (Dashboard) und vault/
// (verschlüsselte Originale, damit `npm run restore` raw/ auf jedem PC
// wiederherstellen kann). Nur verschlüsselte Dateien landen im Repo.
//
//   npm run data
//
// Konfiguration über .env: SDM_PASSWORD (Pflicht), SDM_XLSX (optional)
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { extname, join } from 'node:path'
import ExcelJS from 'exceljs'
import { ROOT, VAULT_DIR, deriveKey, encrypt as encryptWith, fail, loadEnv, metaJson, shortHash } from './common.mjs'

const OUT_DATA = join(ROOT, 'public/data')
const OUT_MEDIA = join(ROOT, 'public/media')
const RAW_DIR = join(ROOT, 'raw')
const MEDIA_DIR = join(RAW_DIR, 'media')

loadEnv()
const PASSWORD = process.env.SDM_PASSWORD
if (!PASSWORD) fail('SDM_PASSWORD fehlt (in .env eintragen) – auf einem neuen PC: npm run restore')
const XLSX = join(ROOT, process.env.SDM_XLSX || 'raw/Alle SdM Spiele.xlsx')
if (!existsSync(XLSX)) fail(`Excel nicht gefunden: ${XLSX}\n  Auf einem neuen PC zuerst: npm run restore`)

// ---------- helpers ----------
const ROMAN = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10, XI: 11, XII: 12, XIII: 13, XIV: 14, XV: 15 }
const showNumber = (s) => (/^\d+$/.test(s) ? Number(s) : ROMAN[s.toUpperCase()])

/** Zellwert als Text; bei RichText werden rot formatierte Teile separat geliefert. */
function cellText(cell) {
  const v = cell.value
  if (v == null) return { text: '', red: '' }
  if (typeof v === 'object' && 'richText' in v) {
    let text = ''
    let red = ''
    for (const part of v.richText) {
      const argb = part.font?.color?.argb
      if (argb && /^FF(FF0000|C00000|E00000)$/i.test(argb)) red += part.text
      else text += part.text
    }
    return { text: text.trim(), red: red.trim() }
  }
  if (typeof v === 'object' && 'result' in v) return { text: String(v.result ?? '').trim(), red: '' }
  return { text: String(v).trim(), red: '' }
}
const txt = (row, col) => cellText(row.getCell(col)).text

const toSeconds = (hms) => {
  const m = hms?.match(/(\d{1,2}):(\d{2}):(\d{2})/)
  return m ? Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]) : null
}
const parseScore = (s) => {
  const m = s?.match(/^(\d+)\s*:\s*(\d+)$/)
  return m ? [Number(m[1]), Number(m[2])] : null
}
const num = (s) => (s && /^\d+$/.test(s) ? Number(s) : null)

/** "25. + 26.12.2010" / "04.11 + 05.11.2011" / "22.12. 2024 + 17.01.2025" → ISO-Daten */
function parseDates(raw) {
  const parts = raw.split('+').map((p) => p.trim())
  const out = []
  let fallback = { m: null, y: null }
  for (let i = parts.length - 1; i >= 0; i--) {
    const m = parts[i].replace(/\s+/g, '').match(/^(\d{1,2})\.?(?:(\d{1,2})\.?)?(\d{4})?$/)
    if (!m) continue
    const d = Number(m[1])
    const mo = m[2] ? Number(m[2]) : fallback.m
    const y = m[3] ? Number(m[3]) : fallback.y
    fallback = { m: mo, y }
    out.unshift(`${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`)
  }
  return out
}

// ---------- parse ----------
const wb = new ExcelJS.Workbook()
await wb.xlsx.readFile(XLSX)
const ws = wb.worksheets[0]

const aliases = JSON.parse(readFileSync(join(ROOT, 'scripts/aliases.json'), 'utf8'))
const aliasOf = (name) => {
  const n = name.toLowerCase()
  for (const [canon, patterns] of Object.entries(aliases)) {
    if (patterns.some((p) => new RegExp(p, 'i').test(n))) return canon
  }
  return name
}

// Seitentabelle (Spalten Q/S/U): Teildauern pro Show
const sideTable = new Map()
ws.eachRow((row, r) => {
  const label = txt(row, 'Q')
  const n = label && showNumber(label)
  if (!n) return
  const parts = txt(row, 'S').split('+').map((p) => toSeconds(p)).filter((x) => x != null)
  const final = parseScore(txt(row, 'U'))
  // Q/U sind über zwei Zeilen verbunden – die zweite Zeile enthält nur die Gesamtdauer
  if (parts.length && !sideTable.has(n)) sideTable.set(n, { parts: parts.length > 1 ? parts : null, final, row: r })
})

const shows = []
let current = null
const warnings = []

ws.eachRow((row) => {
  const c = txt(row, 'C')
  const header = c.match(/^SdM\s+([0-9IVXLC]+)\s*\(([^)]*)\)\s*([0-9X]{2}:[0-9X]{2}:[0-9X]{2})?/i)
  if (header) {
    const label = header[1]
    const meta = txt(row, 'I')
    current = {
      number: showNumber(label),
      label: `SdM ${label}`,
      dates: parseDates(header[2]),
      durationSec: toSeconds(header[3]),
      daysSincePrevious: num(meta.match(/(\d+)\s*Tage/)?.[1]),
      mulertExpress: num(meta.match(/(\d+|XX)\s*Mal\s*Mulert-Express/i)?.[1]),
      trivias: num(meta.match(/(\d+|XX)\s*Trivias/i)?.[1]),
      games: [],
    }
    shows.push(current)
    return
  }
  if (!current) return
  const nr = row.getCell('A').value
  if (typeof nr !== 'number' || nr < 1 || nr > 20) return

  const nameCell = cellText(row.getCell('C'))
  // Zähler der in der Show ausgepackten Spiele ("8 Ausgepackt", "9", "10, …") sind keine Notizen
  const note = txt(row, 'K')
    .replace(/^\d+(\s*ausgepackt)?(\s*[,;:]\s*|\s*$)/i, '')
    .replace(/^./, (c) => c.toUpperCase())
  const mb = note.match(/^(\d+)\.\s*Matchball/i)
  const mbDe = txt(row, 'M')
  const mbDa = txt(row, 'O')
  const isMatchballRow = !!mb
  const played = nameCell.text !== '/' && nameCell.text !== ''
  current.games.push({
    nr,
    points: nr,
    // rot markierter Teil = ursprünglich geplantes, ersetztes Spiel ("Altes Spiel / Neues Spiel")
    name: played ? nameCell.text.replace(/^\s*\/\s*/, '').replace(/\s+/g, ' ') : null,
    replaced: nameCell.red ? nameCell.red.replace(/\s*\/\s*$/, '') : null,
    played,
    score: parseScore(txt(row, 'I')),
    matchball: isMatchballRow
      ? { n: Number(mb[1]), dennis: mbDe && mbDe !== '-' ? mbDe : null, daniel: mbDa && mbDa !== '-' ? mbDa : null }
      : null,
    note: !isMatchballRow && note ? note : null,
  })
})

// ---------- derive + validate ----------
let globalCounter = 0
for (const show of shows) {
  let prev = [0, 0]
  for (const g of show.games) {
    if (!g.played) {
      g.winner = null
      continue
    }
    if (!g.score) {
      warnings.push(`${show.label} Spiel ${g.nr}: Spielstand fehlt`)
      continue
    }
    // Sieger = wer zulegt; der laufende Stand wird aus den Wertigkeiten berechnet,
    // damit Tippfehler in der Excel auffallen, ohne die Auswertung zu verfälschen
    const dDe = g.score[0] - prev[0]
    const dDa = g.score[1] - prev[1]
    if (dDe > 0 && dDa === 0) g.winner = 'dennis'
    else if (dDa > 0 && dDe === 0) g.winner = 'daniel'
    else {
      warnings.push(`${show.label} Spiel ${g.nr} "${g.name}": Sieger nicht erkennbar (${prev.join(':')} → ${g.score.join(':')}) – passt nicht`)
      continue
    }
    const next = g.winner === 'dennis' ? [prev[0] + g.points, prev[1]] : [prev[0], prev[1] + g.points]
    if (next.join(':') !== g.score.join(':')) {
      warnings.push(`${show.label} Spiel ${g.nr} "${g.name}": Excel sagt ${g.score.join(':')}, korrekt ist ${next.join(':')} (korrigiert)`)
      g.score = next
    }
    prev = next
    g.globalNr = ++globalCounter
    g.category = aliasOf(g.name)
  }
  show.final = prev
  show.winner = prev[0] > prev[1] ? 'dennis' : prev[1] > prev[0] ? 'daniel' : null
  show.gamesPlayed = show.games.filter((g) => g.played).length
  const side = sideTable.get(show.number)
  show.durationParts = side?.parts ?? null
  if (side?.final && side.final.join(':') !== prev.join(':'))
    warnings.push(`${show.label}: Endstand ${prev.join(':')} ≠ Übersicht ${side.final.join(':')}`)
  // Sieg muss sicher sein: Gewinner > Verlierer + restliche Punkte
  const lastNr = show.games.filter((g) => g.played).at(-1)?.nr ?? 0
  let remaining = 0
  for (let n = lastNr + 1; n <= 20; n++) remaining += n
  if (Math.abs(prev[0] - prev[1]) <= remaining && lastNr < 20)
    warnings.push(`${show.label}: nach Spiel ${lastNr} noch nicht entschieden (${prev.join(':')})`)
}

// ---------- media ----------
const MEDIA_EXT = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif', '.mp4': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime' }

// ---------- fatal checks before writing anything ----------
if (warnings.some((w) => /passt nicht|Endstand|fehlt/.test(w))) {
  for (const w of warnings) console.warn(`  - ${w}`)
  fail('Daten-Validierung fehlgeschlagen – nichts geschrieben.')
}

// ---------- crypto ----------
const { key, salt, changed } = deriveKey(PASSWORD, { allowNew: true })
if (changed && existsSync(join(OUT_DATA, 'meta.json'))) console.log('ℹ Neues Passwort erkannt – alles wird neu verschlüsselt.')
const encrypt = (buf) => encryptWith(key, buf)

mkdirSync(OUT_DATA, { recursive: true })
mkdirSync(OUT_MEDIA, { recursive: true })

const mediaCount = { files: 0, bytes: 0 }
const wanted = new Set()
if (existsSync(MEDIA_DIR)) {
  for (const dir of readdirSync(MEDIA_DIR, { withFileTypes: true })) {
    if (!dir.isDirectory()) continue
    const sm = dir.name.match(/^sdm-?(\d+)$/i)
    if (!sm) {
      warnings.push(`Medienordner ignoriert: ${dir.name} (erwartet sdm-12)`)
      continue
    }
    const show = shows.find((s) => s.number === Number(sm[1]))
    if (!show) {
      warnings.push(`Medienordner ${dir.name}: Show nicht gefunden`)
      continue
    }
    for (const f of readdirSync(join(MEDIA_DIR, dir.name)).sort()) {
      const type = MEDIA_EXT[extname(f).toLowerCase()]
      const fm = f.match(/^spiel-?(\d+)(?:-(\d+))?(?:[-_ ](.+?))?\.[a-z0-9]+$/i)
      const target = fm && show.games.find((g) => g.nr === Number(fm[1]))
      if (!type || !target) {
        warnings.push(`Mediendatei ignoriert: ${dir.name}/${f} (erwartet spiel-19.jpg / spiel-19-2.mp4)`)
        continue
      }
      const buf = readFileSync(join(MEDIA_DIR, dir.name, f))
      const enc = encrypt(buf)
      const id = shortHash(enc)
      wanted.add(`${id}.bin`)
      writeFileSync(join(OUT_MEDIA, `${id}.bin`), enc)
      ;(target.media ??= []).push({ id, file: f, type, size: buf.length, caption: fm[3]?.replace(/[-_]/g, ' ') ?? null })
      mediaCount.files++
      mediaCount.bytes += buf.length
      if (buf.length > 50 * 1024 * 1024) warnings.push(`${dir.name}/${f} ist ${(buf.length / 1048576).toFixed(0)} MB – bitte komprimieren (GitHub-Limit 100 MB)`)
    }
  }
}
// verwaiste verschlüsselte Medien entfernen
for (const f of readdirSync(OUT_MEDIA)) if (f.endsWith('.bin') && !wanted.has(f)) rmSync(join(OUT_MEDIA, f))

// ---------- write ----------
const data = { generated: new Date().toISOString().slice(0, 10), players: { dennis: 'Dennis', daniel: 'Daniel' }, shows }
writeFileSync(join(OUT_DATA, 'sdm.enc'), encrypt(Buffer.from(JSON.stringify(data))))
writeFileSync(join(OUT_DATA, 'meta.json'), metaJson(key, salt))

// ---------- vault: verschlüsselte Originale aus raw/ (media/ steckt schon in public/media) ----------
mkdirSync(VAULT_DIR, { recursive: true })
const vaultFiles = []
for (const f of readdirSync(RAW_DIR)) {
  const full = join(RAW_DIR, f)
  if (!statSync(full).isFile() || f.startsWith('~$')) continue // ~$… = Excel-Sperrdatei
  const enc = encrypt(readFileSync(full))
  const id = shortHash(enc)
  writeFileSync(join(VAULT_DIR, `${id}.enc`), enc)
  vaultFiles.push({ name: f, id })
}
writeFileSync(join(VAULT_DIR, 'index.enc'), encrypt(Buffer.from(JSON.stringify({ files: vaultFiles }))))
const keepVault = new Set(['index.enc', ...vaultFiles.map((v) => `${v.id}.enc`)])
for (const f of readdirSync(VAULT_DIR)) if (!keepVault.has(f)) rmSync(join(VAULT_DIR, f))

// ---------- report ----------
const wins = { dennis: 0, daniel: 0 }
for (const s of shows) if (s.winner) wins[s.winner]++
console.log(`\n✔ ${shows.length} Shows, ${globalCounter} Spiele – Shows: Dennis ${wins.dennis} : ${wins.daniel} Daniel`)
for (const s of shows) console.log(`  ${s.label.padEnd(7)} ${s.dates.join(' + ').padEnd(24)} ${s.final.join(':').padStart(7)}  → ${s.winner}`)
console.log(`  Medien: ${mediaCount.files} Dateien (${(mediaCount.bytes / 1048576).toFixed(1)} MB)`)
console.log(`  Tresor: ${vaultFiles.map((v) => v.name).join(', ')}`)
if (warnings.length) {
  console.warn(`\n⚠ ${warnings.length} Hinweis(e):`)
  for (const w of warnings) console.warn(`  - ${w}`)
}

# Schlag den Mulert

Dashboard mit Statistiken, Historie und Infos zu **Schlag den Mulert**: 20 Spiele pro Show, Spiel *n* zählt *n* Punkte. Es geht um Ruhm, Ehre und 10 Euro.

Vite + React + TypeScript + Tailwind, gehostet auf GitHub Pages.

## Passwortschutz

Das Repo ist öffentlich, die Inhalte aber nicht:

- Alle Daten (`public/data/sdm.enc`) und Medien (`public/media/*.bin`) liegen nur **AES-256-GCM-verschlüsselt** im Repo. Der Schlüssel wird per PBKDF2 (600.000 Iterationen) aus dem Passwort abgeleitet.
- Die Originale (`raw/`: Excel, Logo, Screenshots, Clips) liegen ebenfalls nur verschlüsselt im Repo (`vault/` bzw. `public/media/`). Mit `npm run restore` lassen sie sich auf jedem PC wiederherstellen. Das Passwort (`.env`) wird nie committet.
- Im Browser wird einmal das Passwort eingegeben. Danach merkt sich das Gerät den abgeleiteten Schlüssel (`localStorage`), bis man sich abmeldet.

## Auf einem (neuen) PC einrichten

Voraussetzung: [Node.js](https://nodejs.org) und Git.

```bash
git clone https://github.com/demuHB/schlag-den-mulert.git
cd schlag-den-mulert
npm install
npm run restore   # fragt einmal nach dem Passwort, legt .env an und stellt raw/ wieder her
npm run dev       # http://localhost:5175
```

Danach liegen Excel, Logo und alle Medien wieder in `raw/`.

**Arbeiten auf mehreren PCs:** Vor dem Bearbeiten immer `git pull` und `npm run restore` ausführen, danach `npm run data`, committen und pushen. Das Repo ist der Abgleich zwischen den Rechnern. `restore` überschreibt keine lokal geänderten Dateien (außer mit `npm run restore -- --force`).

## Neue Show / Korrekturen

1. `raw/Alle SdM Spiele.xlsx` aktualisieren (gleiches Format: Kopfzeile `SdM 13 (TT.MM. + TT.MM.JJJJ) HH:MM:SS`, darunter die Spiele mit Spielstand).
2. `npm run data` ausführen. Das Skript prüft jeden Spielstand gegen die Wertigkeit und meldet Tippfehler.
3. Committen und pushen. GitHub Actions baut und veröffentlicht automatisch.

## Screenshots & Clips

Dateien nach diesem Schema ablegen:

```
raw/media/sdm-12/spiel-19.jpg
raw/media/sdm-12/spiel-19-2.mp4
raw/media/sdm-12/spiel-19-3-der-entscheidende-wurf.webp   ← Text nach der Nummer = Bildunterschrift
```

Erlaubt sind jpg, png, webp, gif, mp4, webm und mov. Danach `npm run data` ausführen, committen und pushen.

Tipps:

- Clips kurz halten und komprimieren (720p, H.264, möglichst unter 25 MB). GitHub erlaubt max. 100 MB pro Datei, das Repo sollte unter ca. 1 GB bleiben.
- Screenshots am besten als webp oder jpg.

## Passwort ändern

`SDM_PASSWORD` in `.env` ändern, dann `npm run data` ausführen, committen und pushen. Alle Geräte müssen sich danach im Browser neu anmelden, und auf anderen PCs muss das neue Passwort in deren `.env` eingetragen werden.

## Weitere Befehle

| Befehl | Zweck |
|---|---|
| `npm run restore` | `raw/` aus den verschlüsselten Dateien im Repo wiederherstellen |
| `npm run icons` | Logo/Icons aus `raw/logo.png` neu erzeugen |
| `npm run build` | Produktions-Build nach `dist/` |
| `npm run lint` | oxlint |

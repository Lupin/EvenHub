# 🥗 Fasting Tracker — Even Hub Application for Even G2

> **For Hermes:** Use the subagent-driven-development skill to implement this plan task by task.
> **For Hermes:** Load the `native-mcp` skill if needed to interact with npm/Node.js.

**Even Realities Developer Docs:** https://hub.evenrealities.com/docs/getting-started/overview

**Goal:** Develop and submit an intermittent fasting tracker on Even Hub for Even G2 glasses, with two display modes, **7 integrated fasting presets** (16:8, 18:6, 20:4, OMAD, 14:10, 5:2 weekday, Alternate Day), and a companion phone configuration app. **All UI text is in English only.**

**Architecture:** Even Hub plugin in TypeScript/HTML/CSS using the `@evenrealities/even_hub_sdk`. The app runs as a web app inside the phone browser, connected to the glasses via the Even bridge. Two display pages (text mode + timeline mode) with switching via touchpads. A companion app for configuration: **fasting type preset selection** with visual preview, customizable fasting windows, display preferences. Submission via Even Hub Console.

**Tech Stack:** TypeScript, Vite, Even Hub SDK (`@evenrealities/even_hub_sdk`), Simulator (`@evenrealities/evenhub-simulator`), CLI (`@evenrealities/evenhub-cli`), localStorage for settings persistence.

**Canvas:** 576×288 px per eye, 4-bit greyscale (16 shades of green)

**Repo:** `/Users/gael/Documents/GitHub/EvenHub/fasting-tracker/`

---

## 🖼️ Display Mode Previews

### Text Mode — discreet corner display

```
┌──────────────────────────────────────────────────────────────┐
│  16:8 — Leangains                            5h 23m         │
│                                                              │
│                                                              │
│                                                              │
│                                                              │
│                                                              │
│                                                              │
│                                                              │
│                                                              │
│                                                              │
│                                                              │
│                          FASTING                             │
└──────────────────────────────────────────────────────────────┘
  576×288 px canvas, 4-bit greyscale (green)
  Top-left: preset name    Top-right: time remaining
  Bottom-center: FASTING or EATING
```

### Timeline Mode — single-line day bar

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  20:00 ═══════════ ■ ───────────────────── 12:00   14:32    │
│                                                              │
└──────────────────────────────────────────────────────────────┘
  576×288 px canvas, 4-bit greyscale (green)
  ═ = fasting zone (borderColor: 4, darker)  
  ─ = eating window (borderColor: 10, lighter)
  ■ = current-time cursor (10×10 px, borderColor: 15 = white)
  Left label: fast start time    Right label: fast end time + clock
  Single horizontal bar, everything on one visual line
```

---

## Tâche 1 : Initialiser le projet

**Objectif :** Créer la structure du projet Even Hub avec Vite + TypeScript.

**Fichiers :**
- Créer : `ws/even-fasting-tracker/package.json`
- Créer : `ws/even-fasting-tracker/tsconfig.json`
- Créer : `ws/even-fasting-tracker/vite.config.ts`
- Créer : `ws/even-fasting-tracker/index.html`

**Étape 1 : Initialiser le projet**

```bash
cd /Users/gael/ws
mkdir -p even-fasting-tracker
cd even-fasting-tracker
npm init -y
npm install @evenrealities/even_hub_sdk
npm install -D typescript @types/node vite
```

**Étape 2 : Créer vite.config.ts**

```typescript
import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    port: 5173,
    host: true, // nécessaire pour QR sideloading
  },
  build: {
    outDir: 'dist',
  },
})
```

**Étape 3 : Créer tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "jsx": "preserve",
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

**Étape 4 : Créer index.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Fasting Tracker</title>
  <style>
    body { margin: 0; background: #000; overflow: hidden; }
  </style>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/src/main.ts"></script>
</body>
</html>
```
**Étape 5 : Vérifier**

```bash
npm run build   # doit compiler sans erreur
```

---

## Tâche 2 : Architecture et structure du code

**Objectif :** Mettre en place la structure modulaire du code.

**Fichiers :**
- Créer : `src/main.ts` — point d'entrée, init SDK
- Créer : `src/types.ts` — types partagés (FastingSchedule, DisplayMode, etc.)
- Créer : `src/config.ts` — configuration par défaut (fenêtres de jeûne)
- Créer : `src/storage.ts` — localStorage pour les réglages
- Créer : `src/i18n.ts` — traductions EN/FR + helper t()
- Créer : `src/display/text-mode.ts` — mode d'affichage texte
- Créer : `src/display/timeline-mode.ts` — mode d'affichage timeline
- Créer : `src/display/index.ts` — gestionnaire d'affichage, routage des modes
- Créer : `src/input.ts` — gestion des événements touchpad

**Structure finale :**

```
even-fasting-tracker/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── index.html
└── src/
    ├── main.ts
    ├── types.ts
    ├── config.ts
    ├── storage.ts
    ├── input.ts
    ├── phone-config/
    │   └── settings.html     (self-contained companion app)
    └── display/
        ├── index.ts
        ├── text-mode.ts
        └── timeline-mode.ts
```

**Étape : Vérifier la structure**

```bash
ls -R src/
```

---

## Tâche 3 : Définir les types, les presets de jeûne et la configuration

**Objectif :** Définir les structures de données pour le jeûne intermittent, incluant 7 types de jeûne prédéfinis (presets).

**Fichier :** `src/types.ts`

```typescript
export type DisplayMode = 'text' | 'timeline'

/** Type de jeûne intermittent */
export type FastingPresetId =
  | '16:8'       // Leangains — le plus populaire
  | '18:6'       // Extended
  | '20:4'       // Warrior Diet
  | '23:1'       // OMAD (One Meal A Day)
  | '14:10'      // Débutant
  | '5:2-week'   // 5:2 en semaine (jeûne Mar + Jeu)
  | 'adf'        // Alternate Day Fasting (un jour sur deux)
  | 'custom'     // Personnalisé

export interface FastingPreset {
  id: FastingPresetId
  name: string           // ex: "16:8 — Leangains"
  desc: string           // ex: "16h de jeûne, 8h d'alimentation"
  fastStart: string      // HH:MM (24h)
  fastEnd: string        // HH:MM (24h)
  /** Pour les presets hebdomadaires (5:2, ADF), jours actifs */
  activeDays?: number[]  // 0=Dimanche ... 6=Samedi, undefined = tous les jours
  color: string          // Couleur descriptive pour l'UI (pas pour le canvas)
}

export interface FastingWindow {
  /** Heure de début du jeûne (format HH:MM, 24h) */
  fastStart: string   // ex: "20:00"
  /** Heure de fin du jeûne / début de la fenêtre alimentaire */
  fastEnd: string     // ex: "12:00"
}

export interface FastingConfig {
  /** Preset actif (ou 'custom' si personnalisé) */
  presetId: FastingPresetId
  /** Plage de jeûne quotidienne */
  schedule: FastingWindow
  /** Mode d'affichage actif */
  displayMode: DisplayMode
  /** Couleur de fond (niveau de gris 0-15) */
  bgColor: number
  /** Couleur du texte (niveau de gris 0-15) */
  textColor: number
}

export interface FastingState {
  /** Est-on actuellement en période de jeûne ? */
  isFasting: boolean
  /** Nom du preset actif */
  presetName: string
  /** Temps restant dans la période actuelle (secondes) */
  remainingSeconds: number
  /** Progression dans la journée (0.0 - 1.0) */
  dayProgress: number
  /** Progression dans la fenêtre actuelle (0.0 - 1.0) */
  windowProgress: number
  /** Time until next transition (seconds) */
  nextTransitionIn: number
}
```

**Fichier :** `src/config.ts`

```typescript
import type { FastingConfig, FastingPreset, FastingPresetId } from './types'

// ─── Presets de jeûne ─────────────────────────────────────

export const FASTING_PRESETS: FastingPreset[] = [
  {
    id: '14:10',
    name: '14:10 — Beginner',
    desc: '14h fast · 10h eating',
    fastStart: '20:00',
    fastEnd: '10:00',
    color: '#4CAF50',
  },
  {
    id: '16:8',
    name: '16:8 — Leangains',
    desc: '16h fast · 8h eating',
    fastStart: '20:00',
    fastEnd: '12:00',
    color: '#2196F3',
  },
  {
    id: '18:6',
    name: '18:6 — Extended',
    desc: '18h fast · 6h eating',
    fastStart: '20:00',
    fastEnd: '14:00',
    color: '#9C27B0',
  },
  {
    id: '20:4',
    name: '20:4 — Warrior Diet',
    desc: '20h fast · 4h eating',
    fastStart: '20:00',
    fastEnd: '16:00',
    color: '#FF9800',
  },
  {
    id: '23:1',
    name: 'OMAD — One Meal A Day',
    desc: '23h fast · 1 meal',
    fastStart: '19:00',
    fastEnd: '18:00',
    color: '#F44336',
  },
  {
    id: '5:2-week',
    name: '5:2 — Weekday',
    desc: '5d normal · 2d fast (Tue+Thu)',
    fastStart: '20:00',
    fastEnd: '12:00',
    activeDays: [2, 4],
    color: '#607D8B',
  },
  {
    id: 'adf',
    name: 'ADF — Alternate Day',
    desc: 'Fast every other day',
    fastStart: '20:00',
    fastEnd: '12:00',
    activeDays: undefined,
    color: '#795548',
  },
]

export function getPreset(id: FastingPresetId): FastingPreset | undefined {
  return FASTING_PRESETS.find(p => p.id === id)
}

export function applyPreset(preset: FastingPreset): FastingConfig['schedule'] {
  return {
    fastStart: preset.fastStart,
    fastEnd: preset.fastEnd,
  }
}

export const DEFAULT_CONFIG: FastingConfig = {
  presetId: '16:8',
  schedule: {
    fastStart: '20:00',
    fastEnd: '12:00',
  },
  displayMode: 'text',
  bgColor: 0,
  textColor: 12,
}

/** Vérifie si aujourd'hui est un jour de jeûne (pour 5:2, ADF) */
export function isFastingDay(preset: FastingPreset): boolean {
  if (!preset.activeDays) {
    if (preset.id === 'adf') {
      // Alternate Day : jour pair de l'année = jeûne
      const now = new Date()
      const startOfYear = new Date(now.getFullYear(), 0, 0)
      const diff = now.getTime() - startOfYear.getTime()
      const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24))
      return dayOfYear % 2 === 0
    }
    return true // presets quotidiens : toujours actif
  }
  // 5:2, etc.
  const today = new Date().getDay() // 0=Dimanche
  return preset.activeDays.includes(today)
}

export function getCurrentFastingState(schedule: FastingConfig['schedule']): {
  isFasting: boolean
  fastStartMs: number
  fastEndMs: number
  nowMs: number
} {
  const now = new Date()
  const nowMs = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()

  const [fh, fm] = schedule.fastStart.split(':').map(Number)
  const [eh, em] = schedule.fastEnd.split(':').map(Number)

  const fastStartMs = fh * 3600 + fm * 60
  const fastEndMs = eh * 3600 + em * 60

  // Gestion du cas où la fenêtre traverse minuit
  if (fastEndMs <= fastStartMs) {
    // ex: jeûne 20:00 → 12:00 (traverse minuit)
    const isFasting = nowMs >= fastStartMs || nowMs < fastEndMs
    return { isFasting, fastStartMs, fastEndMs, nowMs }
  } else {
    const isFasting = nowMs >= fastStartMs && nowMs < fastEndMs
    return { isFasting, fastStartMs, fastEndMs, nowMs }
  }
}
```

**Fichier :** `src/storage.ts`

```typescript
import type { FastingConfig } from './types'
import { DEFAULT_CONFIG } from './config'

const STORAGE_KEY = 'even-fasting-config'

export function loadConfig(): FastingConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return { ...DEFAULT_CONFIG }
}

export function saveConfig(config: FastingConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
}
```
**Étape 5 : Vérifier**

```bash
npx tsc --noEmit   # doit passer sans erreur
```

---

## Tâche 4 : Mode Texte — affichage dans les coins

**Objectif :** Afficher le statut du jeûne en texte dans les coins de l'écran (petit, discret).

**Fichier :** `src/display/text-mode.ts`

Principe d'affichage (canvas 576×288) :
- **Coin supérieur gauche** : nom du preset actif (ex: « 16:8 Leangains »)
- **Coin supérieur droit** : temps restant dans la période actuelle (« 5h 23m »)
- **Centre bas** : statut actuel (« FASTING » ou « EATING »)
- La police Even Hub supporte le texte simple (pas d'emojis natifs — on utilise du texte ASCII ou des symboles supportés)

**Code d'implémentation :**

```typescript
import { TextContainerProperty, CreateStartUpPageContainer } from '@evenrealities/even_hub_sdk'
import type { FastingConfig } from '../types'
import { getCurrentFastingState, getPreset } from '../config'

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return `${h}h ${m.toString().padStart(2, '0')}m`
}

export function buildTextPage(config: FastingConfig) {
  const now = new Date()
  const { isFasting } = getCurrentFastingState(config.schedule)

  // Calcul du temps restant
  const [fh, fm] = config.schedule.fastStart.split(':').map(Number)
  const [eh, em] = config.schedule.fastEnd.split(':').map(Number)
  const fastStartSec = fh * 3600 + fm * 60
  const fastEndSec = eh * 3600 + em * 60
  const nowSec = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()

  let remainingSec: number
  if (isFasting) {
    // Combien de temps jusqu'à la fin du jeûne
    if (fastEndSec > fastStartSec) {
      remainingSec = fastEndSec - nowSec
    } else {
      remainingSec = fastEndSec < nowSec
        ? fastEndSec + 86400 - nowSec  // traverse minuit, fin demain
        : fastEndSec - nowSec
    }
    // Valeur par défaut si calcul foireux
    if (remainingSec < 0 || remainingSec > 86400) remainingSec = 0
  } else {
    // Combien de temps jusqu'à la fin de la fenêtre alimentaire
    const nextFastStart = fastStartSec > nowSec ? fastStartSec : fastStartSec + 86400
    remainingSec = nextFastStart - nowSec
    if (remainingSec < 0 || remainingSec > 86400) remainingSec = 0
  }

  const statusLine = isFasting ? 'FASTING' : 'EATING'
  const timeLine = formatTime(remainingSec)
  const preset = getPreset(config.presetId)
  const presetLine = preset ? preset.name : 'Custom'

  // Coin supérieur gauche : nom du preset
  const presetText = new TextContainerProperty({
    xPosition: 4,
    yPosition: 4,
    width: 300,
    height: 24,
    borderWidth: 0,
    borderColor: 5,
    paddingLength: 2,
    containerID: 1,
    containerName: 'preset',
    content: presetLine,
    isEventCapture: 1,
  })

  // Coin supérieur droit : temps restant
  const timeText = new TextContainerProperty({
    xPosition: 372,
    yPosition: 4,
    width: 200,
    height: 24,
    borderWidth: 0,
    borderColor: 5,
    paddingLength: 2,
    containerID: 2,
    containerName: 'timer',
    content: timeLine,
    isEventCapture: 0,
  })

  // Centre bas : statut
  const statusText = new TextContainerProperty({
    xPosition: 4,
    yPosition: 268,  // bas de l'écran
    width: 568,
    height: 20,
    borderWidth: 0,
    borderColor: 12,
    paddingLength: 2,
    containerID: 3,
    containerName: 'status',
    content: statusLine,
    isEventCapture: 0,
  })

  return { presetText, timeText, statusText, isFasting }
}
```

**Vérification :** Compilation TypeScript (`npx tsc --noEmit`)

---

## Tâche 5 : Mode Timeline — barre de progression simplifiée (une ligne)

**Objectif :** Afficher une unique ligne horizontale traversant l'écran, segmentée entre périodes de jeûne et alimentation, avec un curseur lumineux indiquant le moment actuel. Tout tient sur une seule ligne visuelle.

**Fichier :** `src/display/timeline-mode.ts`

Principe d'affichage (canvas 576×288) :
- Une **barre horizontale unique** de ~500px centrée verticalement
- Segment **fasting** (gauche) en gris foncé, segment **eating** (droite) en gris plus clair
- Un **carré lumineux** (10×10 px, bordure blanche 15) qui se déplace sur la barre
- À gauche de la barre : heure de début du jeûne
- À droite : heure de fin + heure actuelle

Contrainte : maximum 8 containers. On utilise :
- 1 container pour le curseur
- 2 containers pour les segments de barre (fasting + eating)
- 2 containers texte pour les labels (heure début, heure fin + clock)
- 1 container pour le statut FASTING/EATING (optionnel, coin haut gauche)
= **5-6 containers max**, bien dans la limite.

```typescript
import { TextContainerProperty, CreateStartUpPageContainer } from '@evenrealities/even_hub_sdk'
import type { FastingConfig } from '../types'
import { getCurrentFastingState, getPreset } from '../config'

export function buildTimelinePage(config: FastingConfig) {
  const now = new Date()
  const nowSec = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()
  const { isFasting } = getCurrentFastingState(config.schedule)

  const [fh, fm] = config.schedule.fastStart.split(':').map(Number)
  const [eh, em] = config.schedule.fastEnd.split(':').map(Number)
  const fastStartSec = fh * 3600 + fm * 60
  const fastEndSec = eh * 3600 + em * 60

  // Barre centrée verticalement
  const barY = 135       // milieu de 288 = 144, décalé vers le haut
  const barLeft = 8
  const barRight = 568   // 576 - 8
  const barWidth = barRight - barLeft  // 560px
  const barHeight = 6
  const cursorSize = 10

  // Position du curseur sur la barre (0.0 à 1.0 = progression de la journée)
  const dayProgress = nowSec / 86400
  const cursorX = barLeft + Math.round(dayProgress * (barWidth - cursorSize))

  // Curseur = carré lumineux au-dessus de la barre
  const cursor = new TextContainerProperty({
    xPosition: cursorX,
    yPosition: barY - 3,
    width: cursorSize,
    height: cursorSize,
    borderWidth: 2,
    borderColor: 15,       // blanc max
    paddingLength: 0,
    containerID: 1,
    containerName: 'cursor',
    content: ' ',
    isEventCapture: 1,
  })

  // Segment fasting = barre foncée
  const fastingSegment = new TextContainerProperty({
    xPosition: barLeft,
    yPosition: barY,
    width: Math.round(dayProgress * barWidth),
    height: barHeight,
    borderWidth: 1,
    borderColor: 4,        // sombre
    paddingLength: 0,
    containerID: 2,
    containerName: 'fastingBar',
    content: ' ',
    isEventCapture: 0,
  })

  // Segment eating = barre claire (à droite du curseur, ou à gauche si jeûne AM)
  const eatingSegment = new TextContainerProperty({
    xPosition: barLeft + Math.round(dayProgress * barWidth),
    yPosition: barY,
    width: barWidth - Math.round(dayProgress * barWidth),
    height: barHeight,
    borderWidth: 1,
    borderColor: 10,       // plus clair
    paddingLength: 0,
    containerID: 3,
    containerName: 'eatingBar',
    content: ' ',
    isEventCapture: 0,
  })

  // Label gauche = heure début jeûne
  const leftLabel = new TextContainerProperty({
    xPosition: 8,
    yPosition: barY + 10,
    width: 60,
    height: 16,
    borderWidth: 0,
    borderColor: 5,
    paddingLength: 1,
    containerID: 4,
    containerName: 'startTime',
    content: config.schedule.fastStart,
    isEventCapture: 0,
  })

  // Label droite = heure fin + clock
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
  const rightLabel = new TextContainerProperty({
    xPosition: 508,
    yPosition: barY + 10,
    width: 68,
    height: 16,
    borderWidth: 0,
    borderColor: 5,
    paddingLength: 1,
    containerID: 5,
    containerName: 'endTime',
    content: `${config.schedule.fastEnd} ${timeStr}`,
    isEventCapture: 0,
  })

  return {
    cursor,
    fastingSegment,
    eatingSegment,
    leftLabel,
    rightLabel,
    isFasting,
  }
}
```

**Vérification :** Compilation TypeScript

---

## Tâche 5b : Internationalisation (i18n) — Anglais / Français

**Objectif :** Permettre à l'utilisateur de choisir entre l'anglais et le français dans l'application companion. Tous les textes UI et les noms de presets sont traduits.

**Fichier :** `src/i18n.ts`

```typescript
export type Language = 'en' | 'fr'

export interface Translations {
  // App
  appTitle: string
  fastingType: string
  schedule: string
  fastStart: string
  fastEnd: string
  displayMode: string
  textMode: string
  textModeDesc: string
  timelineMode: string
  timelineModeDesc: string
  custom: string
  customDesc: string
  cancel: string
  save: string
  language: string
  // Display status
  fasting: string
  eating: string
  restDay: string
  // Presets
  preset_14_10_name: string
  preset_14_10_desc: string
  preset_16_8_name: string
  preset_16_8_desc: string
  preset_18_6_name: string
  preset_18_6_desc: string
  preset_20_4_name: string
  preset_20_4_desc: string
  preset_23_1_name: string
  preset_23_1_desc: string
  preset_5_2_name: string
  preset_5_2_desc: string
  preset_adf_name: string
  preset_adf_desc: string
}

export const translations: Record<Language, Translations> = {
  en: {
    appTitle: 'Fasting Tracker',
    fastingType: 'Fasting Type',
    schedule: 'Schedule',
    fastStart: 'Fast start',
    fastEnd: 'Fast end',
    displayMode: 'Display Mode',
    textMode: 'Text (corners)',
    textModeDesc: 'Discreet, upper corners',
    timelineMode: 'Timeline (bar)',
    timelineModeDesc: 'Day progress bar',
    custom: 'Custom',
    customDesc: 'Set your own hours',
    cancel: 'Cancel',
    save: 'Save',
    language: 'Language',
    fasting: 'FASTING',
    eating: 'EATING',
    restDay: 'REST DAY',
    preset_14_10_name: '14:10 — Beginner',
    preset_14_10_desc: '14h fast · 10h eating',
    preset_16_8_name: '16:8 — Leangains',
    preset_16_8_desc: '16h fast · 8h eating',
    preset_18_6_name: '18:6 — Extended',
    preset_18_6_desc: '18h fast · 6h eating',
    preset_20_4_name: '20:4 — Warrior Diet',
    preset_20_4_desc: '20h fast · 4h eating',
    preset_23_1_name: 'OMAD — One Meal A Day',
    preset_23_1_desc: '23h fast · 1 meal',
    preset_5_2_name: '5:2 — Weekday',
    preset_5_2_desc: '5d normal · 2d fast (Tue+Thu)',
    preset_adf_name: 'ADF — Alternate Day',
    preset_adf_desc: 'Fast every other day',
  },
  fr: {
    appTitle: 'Suivi Jeûne',
    fastingType: 'Type de jeûne',
    schedule: 'Horaires',
    fastStart: 'Début du jeûne',
    fastEnd: 'Fin du jeûne',
    displayMode: 'Mode d\'affichage',
    textMode: 'Texte (coins)',
    textModeDesc: 'Discret, coins supérieurs',
    timelineMode: 'Barre (timeline)',
    timelineModeDesc: 'Barre de progression',
    custom: 'Personnalisé',
    customDesc: 'Définir vos horaires',
    cancel: 'Annuler',
    save: 'Enregistrer',
    language: 'Langue',
    fasting: 'JEÛNE',
    eating: 'REPAS',
    restDay: 'JOUR REPOS',
    preset_14_10_name: '14:10 — Débutant',
    preset_14_10_desc: '14h jeûne · 10h repas',
    preset_16_8_name: '16:8 — Leangains',
    preset_16_8_desc: '16h jeûne · 8h repas',
    preset_18_6_name: '18:6 — Avancé',
    preset_18_6_desc: '18h jeûne · 6h repas',
    preset_20_4_name: '20:4 — Warrior Diet',
    preset_20_4_desc: '20h jeûne · 4h repas',
    preset_23_1_name: 'OMAD — Un repas par jour',
    preset_23_1_desc: '23h jeûne · 1 repas',
    preset_5_2_name: '5:2 — Semaine',
    preset_5_2_desc: '5j normal · 2j jeûne (Mar+Jeu)',
    preset_adf_name: 'ADF — Jour alterné',
    preset_adf_desc: 'Jeûne un jour sur deux',
  },
}

export function t(lang: Language, key: keyof Translations): string {
  return translations[lang]?.[key] ?? translations.en[key] ?? key
}

export function getPresetName(id: string, lang: Language): string {
  const key = `preset_${id.replace(/[:-]/g, '_').toLowerCase()}_name` as keyof Translations
  return t(lang, key)
}

export function getPresetDesc(id: string, lang: Language): string {
  const key = `preset_${id.replace(/[:-]/g, '_').toLowerCase()}_desc` as keyof Translations
  return t(lang, key)
}
```

---

## Tâche 6 : Gestionnaire d'affichage et bascule entre modes

**Objectif :** Gérer l'affichage actif et la bascule entre text-mode et timeline-mode via le touchpad.

**Fichier :** `src/display/index.ts`

```typescript
import type { EvenAppBridge } from '@evenrealities/even_hub_sdk'
import type { FastingConfig } from '../types'
import { loadConfig, saveConfig } from '../storage'
import { buildTextPage } from './text-mode'
import { buildTimelinePage } from './timeline-mode'

export async function renderCurrentMode(bridge: EvenAppBridge) {
  const config = loadConfig()

  if (config.displayMode === 'text') {
    const { statusText, timeText } = buildTextPage(config)
    const containerTotal = 2
    const textObject = [statusText, timeText]

    const result = await bridge.createStartUpPageContainer({
      containerTotalNum: containerTotal,
      textObject,
    })
    return result
  } else {
    const { cursor, barBg, statusText, hoursText, clockText } = buildTimelinePage(config)

    const result = await bridge.createStartUpPageContainer({
      containerTotalNum: 5,
      textObject: [cursor, barBg, statusText, hoursText, clockText],
    })
    return result
  }
}

export function toggleDisplayMode(): FastingConfig {
  const config = loadConfig()
  config.displayMode = config.displayMode === 'text' ? 'timeline' : 'text'
  saveConfig(config)
  return config
}
```

---

## Tâche 7 : Gestion des entrées (touchpad)

**Objectif :** Basculer entre les modes d'affichage via les gestes du touchpad Even G2.

**Fichier :** `src/input.ts`

```typescript
import { EvenAppBridge } from '@evenrealities/even_hub_sdk'
import { toggleDisplayMode, renderCurrentMode } from './display'

export function setupInputHandlers(bridge: EvenAppBridge) {
  // Le SDK Even Hub expose les événements via le container isEventCapture
  // Les événements possibles : press, doublePress, swipeUp, swipeDown

  // Note : l'API exacte d'abonnement aux événements dépend du SDK.
  // Approche typique :
  bridge.addEventListener('swipeUp', async () => {
    toggleDisplayMode()
    await renderCurrentMode(bridge)
  })

  bridge.addEventListener('swipeDown', async () => {
    toggleDisplayMode()
    await renderCurrentMode(bridge)
  })
}
```

**Note :** L'API exacte pour les événements doit être vérifiée dans la doc `Input & Events` du SDK. La structure pourrait être basée sur `container.setEventCallback()` ou un event emitter global.

---

## Tâche 8 : Point d'entrée principal

**Objectif :** Initialiser le SDK Even, charger la config, afficher la page initiale.

**Fichier :** `src/main.ts`

```typescript
import { waitForEvenAppBridge } from '@evenrealities/even_hub_sdk'
import { renderCurrentMode } from './display'
import { setupInputHandlers } from './input'
import { loadConfig } from './storage'
import { getPreset, isFastingDay } from './config'

async function main() {
  try {
    const bridge = await waitForEvenAppBridge()
    console.log('[FastingTracker] Bridge connected')

    // Vérifier si aujourd'hui est un jour de jeûne (5:2, ADF)
    const config = loadConfig()
    const preset = getPreset(config.presetId)
    if (preset && !isFastingDay(preset)) {
      // Jour sans jeûne → afficher un message minimal
      // (ou ne rien afficher, ou afficher "REST DAY")
      console.log('[FastingTracker] Rest day — no fasting today')
    }

    // Rendu initial selon la config sauvegardée
    await renderCurrentMode(bridge)

    // Écouter les événements pour basculer entre modes
    setupInputHandlers(bridge)

    // Rafraîchissement périodique (toutes les 30s)
    setInterval(async () => {
      await renderCurrentMode(bridge)
    }, 30000)
  } catch (err) {
    console.error('[FastingTracker] Failed to init:', err)
  }
}

main()
```

---

## Tâche 9 : Application companion de configuration (téléphone)

**Objectif :** Créer une interface de configuration pour le téléphone, permettant de sélectionner le type de jeûne (preset), de personnaliser les horaires si besoin, et de choisir le mode d'affichage.

**Fichiers :**
- Créer : `src/phone-config/App.tsx`
- Créer : `src/phone-config/SettingsPage.tsx`
- Créer : `src/phone-config/index.html`

**Approche :** L'application Even Hub se charge dans l'app Even Realities sur le téléphone. On utilise une deuxième page qui n'est pas affichée sur les lunettes mais sert de configuration.

```typescript
// src/phone-config/SettingsPage.tsx

import { useState } from 'react'
import type { FastingConfig, FastingPreset, FastingPresetId } from '../types'
import type { Language } from '../i18n'
import { FASTING_PRESETS, getPreset, applyPreset } from '../config'
import { t, getPresetName, getPresetDesc, translations } from '../i18n'

interface SettingsProps {
  config: FastingConfig
  lang: Language
  onSave: (config: FastingConfig) => void
  onLanguageChange: (lang: Language) => void
  onCancel: () => void
}

function SettingsPage({ config, lang, onSave, onLanguageChange, onCancel }: SettingsProps) {
  const [selectedPreset, setSelectedPreset] = useState<FastingPresetId>(config.presetId)
  const [fastStart, setFastStart] = useState(config.schedule.fastStart)
  const [fastEnd, setFastEnd] = useState(config.schedule.fastEnd)
  const [displayMode, setDisplayMode] = useState(config.displayMode)

  const handlePresetChange = (presetId: FastingPresetId) => {
    setSelectedPreset(presetId)
    if (presetId !== 'custom') {
      const preset = getPreset(presetId)
      if (preset) {
        setFastStart(preset.fastStart)
        setFastEnd(preset.fastEnd)
      }
    }
  }

  const handleSave = () => {
    onSave({
      presetId: selectedPreset,
      schedule: { fastStart, fastEnd },
      displayMode,
      lang,
      bgColor: config.bgColor,
      textColor: config.textColor,
    })
  }

  return (
    <div className="settings-page">
      <h2>{t(lang, 'appTitle')}</h2>

      {/* ─── Language selector ──────────────────────── */}
      <section className="lang-section">
        <h3>{t(lang, 'language')}</h3>
        <div className="lang-toggle">
          <button
            className={lang === 'en' ? 'active' : ''}
            onClick={() => onLanguageChange('en')}
          >EN</button>
          <button
            className={lang === 'fr' ? 'active' : ''}
            onClick={() => onLanguageChange('fr')}
          >FR</button>
        </div>
      </section>

      {/* ─── Preset selector ────────────────────────── */}
      <section className="preset-section">
        <h3>{t(lang, 'fastingType')}</h3>
        <div className="preset-grid">
          {FASTING_PRESETS.map(preset => (
            <div
              key={preset.id}
              className={`preset-card ${selectedPreset === preset.id ? 'active' : ''}`}
              style={{ borderColor: selectedPreset === preset.id ? preset.color : 'transparent' }}
              onClick={() => handlePresetChange(preset.id)}
            >
              <div className="preset-icon" style={{ background: preset.color }} />
              <div className="preset-info">
                <span className="preset-name">{getPresetName(preset.id, lang)}</span>
                <span className="preset-desc">{getPresetDesc(preset.id, lang)}</span>
              </div>
            </div>
          ))}
          <div
            className={`preset-card ${selectedPreset === 'custom' ? 'active' : ''}`}
            onClick={() => handlePresetChange('custom')}
          >
            <div className="preset-icon custom" />
            <div className="preset-info">
              <span className="preset-name">{t(lang, 'custom')}</span>
              <span className="preset-desc">{t(lang, 'customDesc')}</span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Time settings ──────────────────────────── */}
      <section className="time-section">
        <h3>{t(lang, 'schedule')}</h3>
        <div className="time-inputs">
          <label>
            {t(lang, 'fastStart')}
            <input type="time" value={fastStart}
              onChange={e => { setFastStart(e.target.value); setSelectedPreset('custom') }}
            />
          </label>
          <span className="time-arrow">→</span>
          <label>
            {t(lang, 'fastEnd')}
            <input type="time" value={fastEnd}
              onChange={e => { setFastEnd(e.target.value); setSelectedPreset('custom') }}
            />
          </label>
        </div>
      </section>

      {/* ─── Display mode ───────────────────────────── */}
      <section className="display-section">
        <h3>{t(lang, 'displayMode')}</h3>
        <div className="mode-selector">
          <button
            className={displayMode === 'text' ? 'active' : ''}
            onClick={() => setDisplayMode('text')}
          >
            <span className="mode-icon">📝</span>
            <span>{t(lang, 'textMode')}</span>
            <small>{t(lang, 'textModeDesc')}</small>
          </button>
          <button
            className={displayMode === 'timeline' ? 'active' : ''}
            onClick={() => setDisplayMode('timeline')}
          >
            <span className="mode-icon">📊</span>
            <span>{t(lang, 'timelineMode')}</span>
            <small>{t(lang, 'timelineModeDesc')}</small>
          </button>
        </div>
      </section>

      <div className="actions">
        <button className="btn-cancel" onClick={onCancel}>{t(lang, 'cancel')}</button>
        <button className="btn-save" onClick={handleSave}>{t(lang, 'save')}</button>
      </div>
    </div>
  )
}
```

**Styles CSS à fournir :**
```css
/* src/phone-config/styles.css */
.settings-page {
  padding: 16px;
  color: #e0e0e0;
  background: #111;
  min-height: 100vh;
  font-family: system-ui, sans-serif;
}
.preset-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin: 12px 0;
}
.preset-card {
  border: 1px solid #333;
  border-radius: 8px;
  padding: 10px;
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  background: #1a1a1a;
  transition: border-color 0.2s;
}
.preset-card.active {
  border-color: #2196F3;
  background: #1a2a3a;
}
.preset-icon {
  width: 24px; height: 24px;
  border-radius: 50%;
  flex-shrink: 0;
}
.preset-icon.custom {
  background: conic-gradient(#666 0deg 72deg, #444 72deg 360deg);
  border: 2px dashed #888;
}
.preset-name {
  font-size: 14px;
  font-weight: 600;
  display: block;
}
.preset-desc {
  font-size: 11px;
  color: #888;
}
.time-inputs {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 8px 0;
}
.time-arrow { font-size: 18px; color: #666; }
.mode-selector {
  display: flex;
  gap: 8px;
  margin: 8px 0;
}
.mode-selector button {
  flex: 1;
  padding: 12px;
  border: 1px solid #333;
  border-radius: 8px;
  background: #1a1a1a;
  color: #ccc;
  cursor: pointer;
  text-align: center;
}
.mode-selector button.active {
  border-color: #2196F3;
  background: #1a2a3a;
}
.mode-selector .mode-icon { font-size: 24px; display: block; margin-bottom: 4px; }
.mode-selector small { display: block; font-size: 10px; color: #666; margin-top: 2px; }
.actions {
  display: flex;
  gap: 8px;
  margin-top: 20px;
}
.btn-save, .btn-cancel {
  flex: 1;
  padding: 12px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  cursor: pointer;
}
.btn-save { background: #2196F3; color: #fff; }
.btn-cancel { background: #333; color: #ccc; }
```

---

## Tâche 10 : Packaging, déploiement et soumission Even Hub

**Objectif :** Préparer l'application pour la soumission sur Even Hub et la déployer.

**Fichier :** `even-hub.json` (manifest de l'application)

```json
{
  "name": "Fasting Tracker",
  "version": "1.0.0",
  "description": "Intermittent fasting tracker for Even G2 — discreet text and timeline modes",
  "author": "Gael",
  "icon": "icon.png",
  "entry": "index.html",
  "permissions": ["storage"],
  "type": "plugin"
}
```

**Étapes de soumission :**

1. **Build de production :**
   ```bash
   cd even-fasting-tracker && npm run build
   ```

2. **Tester avec le simulateur :**
   ```bash
   npx evenhub-simulator http://localhost:5173
   ```

3. **Tester sur matériel réel (QR sideloading) :**
   ```bash
   npx evenhub qr --url "http://<VOTRE_IP>:5173"
   ```
   Scanner avec l'application Even Realities sur le téléphone.

4. **Soumettre via Even Hub Console :**
   - Aller sur https://hub.evenrealities.com/console
   - Se connecter (créer un compte développeur si nécessaire)
   - Cliquer sur « Submit App »
   - Uploader le build (dossier `dist/`)
   - Remplir les métadonnées
   - Soumettre pour review

**QA Checklist pour soumission :**
- [ ] L'application s'affiche correctement sur la G2 (résolution 576×288)
- [ ] Les deux modes s'affichent sans débordement
- [ ] La bascule entre modes fonctionne (swipe up/down)
- [ ] Le rafraîchissement périodique met à jour l'affichage
- [ ] Les réglages persistent entre les sessions (localStorage)
- [ ] Pas de dépassement du nombre max de containers (max 8 non-image)
- [ ] Pas de couleurs hors de la palette 4-bit greyscale
- [ ] Le texte est lisible à la taille affichée

---

## Tâche 11 : Documentation et README

**Objectif :** Documenter le projet pour la soumission et les utilisateurs.

**Fichier :** `README.md`

```markdown
# Fasting Tracker for Even G2

Suivi de jeûne intermittent discret pour Even G2.

## Modes d'affichage

### Text Mode
Affiche le statut (FASTING/EATING) et le temps restant dans les coins supérieurs.

### Timeline Mode
Barre horizontale représentant la journée, avec curseur lumineux indiquant le moment actuel. Les périodes de jeûne et d'alimentation sont segmentées visuellement.

## Configuration
Les réglages (fenêtres de jeûne, mode d'affichage) se font depuis l'interface utilisateur dans l'application téléphone.

## Développement

```bash
npm install
npm run dev
npx evenhub-simulator http://localhost:5173
```
```

---

## Résumé des fichiers modifiés/créés

| Fichier | Action |
|---------|--------|
| `ws/even-fasting-tracker/package.json` | Créer |
| `ws/even-fasting-tracker/tsconfig.json` | Créer |
| `ws/even-fasting-tracker/vite.config.ts` | Créer |
| `ws/even-fasting-tracker/index.html` | Créer |
| `ws/even-fasting-tracker/even-hub.json` | Créer |
| `ws/even-fasting-tracker/README.md` | Créer |
| `ws/even-fasting-tracker/src/main.ts` | Créer |
| `ws/even-fasting-tracker/src/types.ts` | Créer |
| `ws/even-fasting-tracker/src/config.ts` | Créer |
| `ws/even-fasting-tracker/src/storage.ts` | Créer |
| `ws/even-fasting-tracker/src/input.ts` | Créer |
| `ws/even-fasting-tracker/src/display/index.ts` | Créer |
| `ws/even-fasting-tracker/src/display/text-mode.ts` | Créer |
| `ws/even-fasting-tracker/src/display/timeline-mode.ts` | Créer |
|| `src/phone-config/settings.html` | Créer (self-contained) |

## Risques et questions ouvertes

1. **API événements exacte** — L'API pour `addEventListener` sur le bridge doit être vérifiée dans la doc Even Hub (section Input & Events). La syntaxe exacte peut différer.
2. **Couleur de fond des containers** — Le SDK ne semble pas exposer de propriété `backgroundColor` ; la barre de timeline devra peut-être utiliser des astuces de bordure.
3. **Fontes supportées** — Vérifier quelles fontes sont disponibles et si les symboles ASCII/barres fonctionnent.
4. **Performance du setInterval 30s** — Sur batterie de lunettes, un intervalle plus long (60s) pourrait être préférable.
5. **Application phone companion** — L'interface de réglages peut être soit une page séparée dans le plugin, soit une page web statique hébergée à part. À confirmer avec les guidelines Even Hub.
6. **Compte développeur** — Nécessite de créer un compte sur Even Hub Console pour soumettre.
7. **Présence dans l'Even Hub** — L'application devra passer le processus de QA d'Even Realities avant d'être listée.

---

## Ordre d'exécution recommandé

```
Tâche 1  →  Initialiser le projet (npm, packages)
Tâche 2  →  Structure du code (dossiers)
Tâche 3  →  Types & configuration
Tâche 4  →  Mode Texte
Tâche 5  →  Mode Timeline
Tâche 6  →  Gestionnaire d'affichage
Tâche 7  →  Entrées (touchpad)
Tâche 8  →  Point d'entrée principal
Tâche 9  →  Application companion téléphone
Tâche 10 →  Packaging & soumission
Tâche 11 →  Documentation
```

Chaque tâche doit être suivie d'une vérification (`npx tsc --noEmit`, test simulateur).

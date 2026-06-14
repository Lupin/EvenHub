# Hermes Agent → G2 Glasses Display App — Implementation Plan v2

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.
>
> Previous plan (replaced): `.hermes/plans/2026-06-14_164232-hermes-g2-display.md` — that plan had a passive-only inbox. This v2 adds companion-app-driven content selection.

**Goal:** Build a G2 companion app where the **phone is the control center** and the **glasses are the display**. The user picks what Hermes content to show (cron jobs, sessions, specific messages) from the phone UI, and it renders on the G2 glasses. Hermes provides the data backend.

**Architecture:**
```
┌──────────┐  localStorage  ┌──────────────┐  fetch/poll  ┌──────────┐
│  PHONE   │ ◄────────────► │  COMPANION   │ ◄──────────► │  HERMES  │
│  config  │   bridge sync  │  WEBVIEW     │  JSON API    │  cron    │
│  select  │                │  (same HTML) │              │  sessions│
└──────────┘                └──────┬───────┘              └──────────┘
                                   │ SDK bridge
                              ┌────▼──────┐
                              │  G2 DISPLAY│
                              │  (read-only)
                              └───────────┘
```
- **Phone UI** — settings, source selection, message browser, refresh trigger
- **Companion WebView** — the bridge; receives phone config via localStorage, renders on G2
- **G2 Display** — text/list containers only; no interaction beyond navigation (swipe/back)
- **Hermes Backend** — JSON file API (`public/data.json` updated by cron), or future HTTP API

**Tech Stack:** TypeScript + @evenrealities/even_hub_sdk 0.0.10 + Vite + even-toolkit CSS tokens

---

## Data Flow

```
1. Hermes cron writes → public/data.json (or API endpoint)
2. Companion WebView polls data.json every 30s
3. Phone UI reads user config from localStorage:
   - Selected source type (cron / sessions / all)
   - Selected specific job/session
   - Max messages to show
   - Current detail message index
4. Phone UI writes config to localStorage
5. Companion listens for `storage` event → triggers G2 re-render
6. G2 displays whatever the phone selected
```

---

## Phone UI Layout (Companion App)

```
┌─────────────────────────────────┐
│         ⚡ Hermes G2            │  ← App title
│   Your Agent, on your glasses  │  ← Subtitle
├─────────────────────────────────┤
│  DISPLAY                        │
│  ┌───────────────────────────┐  │
│  │ Source:  [Cron Jobs  ▼]   │  │  ← <select> dropdown
│  │ Job:     [veille-akiya ▼] │  │  ← filtered by source
│  └───────────────────────────┘  │
├─────────────────────────────────┤
│  MESSAGES (12)                  │
│  ┌───────────────────────────┐  │
│  │ 14/06 09:00 🏠 3 annonces │  │  ← scrollable list
│  │ 13/06 21:00 🏠 2 annonces │  │     (max 8 visible)
│  │ 13/06 09:00 ✈️ vols <700€ │  │
│  │ 12/06 21:00 📋 session    │  │
│  │          ...              │  │
│  └───────────────────────────┘  │
│  [Refresh now]                  │  ← button
├─────────────────────────────────┤
│  v0.1.0                         │  ← version footer
└─────────────────────────────────┘
```

---

## G2 Display Layout

**Level 0 — Message List (same as phone selection):**
```
┌──────────────────────────────────┐
│ Hermes · Cron · veille-akiya (12)│  ← header (text container, isEventCapture:0)
├──────────────────────────────────┤
│ 14/06 09:00  🏠 3 nouvelles...  │  ← list container (isEventCapture:1)
│ 13/06 21:00  🏠 2 nouvelles...  │     swipe to scroll
│ 13/06 09:00  ✈️ vols <700€      │     tap → detail
│           ...                   │     double-tap → exit
└──────────────────────────────────┘
```

**Level 1 — Message Detail (tap on a message):**
```
┌──────────────────────────────────┐
│ 🏠 VEILLE AKIYA — 14 JUIN 2026  │
│                                  │  ← text container
│ 3 nouvelles annonces.            │     scrollable if overflow
│                                  │     double-tap → back to list
│ 1. Maison traditionnelle         │
│    Kyoto, 8,2M¥                 │
│                                  │
│ 2. Kominka rénovée               │
│    Kanazawa, 5,5M¥              │
│          ...                    │
└──────────────────────────────────┘
```

---

## Phase 1 — Companion-Driven Display (MVP)

---

### Task 1: Project scaffold

**Objective:** Initialize the Even Hub project

**Files:**
- Create: `hermes-g2/package.json`
- Create: `hermes-g2/tsconfig.json`
- Create: `hermes-g2/vite.config.ts`
- Create: `hermes-g2/app.json`

**Step 1: Write package.json**

```json
{
  "name": "hermes-g2",
  "version": "0.1.0",
  "description": "Hermes Agent on G2 glasses — companion-driven display",
  "scripts": {
    "dev": "vite --host 0.0.0.0 --port 5174",
    "build": "vite build",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@evenrealities/even_hub_sdk": "0.0.10"
  },
  "devDependencies": {
    "@types/node": "^25.9.3",
    "esbuild": "^0.28.1",
    "typescript": "^6.0.3",
    "vite": "^8.0.16"
  }
}
```

**Step 2: Write tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

**Step 3: Write vite.config.ts**

```typescript
import { defineConfig } from 'vite'

export default defineConfig({
  root: '.',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2020',
    modulePreload: false,
    cssMinify: true,
    minify: 'esbuild',
    rollupOptions: {
      input: 'index.html',
      output: {
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]'
      }
    }
  },
  server: {
    host: '0.0.0.0',
    port: 5174
  }
})
```

**Step 4: Write app.json**

```json
{
  "package_id": "com.nous.hermesg2",
  "edition": "202601",
  "name": "Hermes G2",
  "version": "0.1.0",
  "min_app_version": "2.0.0",
  "min_sdk_version": "0.0.10",
  "entrypoint": "index.html",
  "permissions": [],
  "supported_languages": ["en", "fr"],
  "type": "plugin"
}
```

**Step 5: Install + verify**

```bash
cd /Users/gael/Documents/GitHub/EvenHub/hermes-g2
npm install
npx tsc --noEmit  # no files yet, should be clean
```

---

### Task 2: Define types

**Objective:** All TypeScript interfaces for messages, config, and app state

**Files:**
- Create: `hermes-g2/src/types.ts`

```typescript
// ── Data types ──────────────────────────────────────────────

/** A single message from Hermes */
export interface HermesMessage {
  ts: number              // Unix ms
  source: 'cron' | 'session' | 'direct'
  /** Cron job name, session ID, or sender label */
  label: string
  /** First line = title, rest = body */
  body: string
}

/** Collection of messages, newest first */
export interface MessageStore {
  messages: HermesMessage[]
  /** Available sources for filtering */
  sources: SourceInfo[]
}

/** Metadata about an available source */
export interface SourceInfo {
  type: 'cron' | 'session' | 'direct'
  label: string          // e.g., 'veille-akiya-japon'
  count: number          // messages from this source
}

// ── Config types ────────────────────────────────────────────

/** User configuration persisted in localStorage */
export interface G2Config {
  /** Which source type to filter by, or 'all' */
  sourceType: 'cron' | 'session' | 'direct' | 'all'
  /** Specific source label to filter by, or '' for all of that type */
  sourceLabel: string
  /** Maximum messages to show on G2 (1-20) */
  maxMessages: number
}

export const DEFAULT_CONFIG: G2Config = {
  sourceType: 'all',
  sourceLabel: '',
  maxMessages: 20,
}

// ── App state types ─────────────────────────────────────────

export type NavLevel = 0 | 1  // 0=list, 1=detail

/** Runtime state (not persisted — lives in main.ts) */
export interface AppState {
  level: NavLevel
  detailIndex: number    // which message is shown in detail
}

// ── i18n (minimal, for companion UI) ────────────────────────

export type Lang = 'en' | 'fr'

export const T: Record<Lang, Record<string, string>> = {
  en: {
    title: 'Hermes G2',
    subtitle: 'Your Agent, on your glasses.',
    sourceLabel: 'Source',
    jobLabel: 'Job',
    allSources: 'All Sources',
    allJobs: 'All Jobs',
    refresh: 'Refresh now',
    messages: 'messages',
    message: 'message',
    noMessages: 'No messages yet.',
    connected: 'Connected — Hermes is on your glasses',
    selectSource: 'Select a source on your phone first.',
  },
  fr: {
    title: 'Hermes G2',
    subtitle: 'Votre Agent, sur vos lunettes.',
    sourceLabel: 'Source',
    jobLabel: 'Job',
    allSources: 'Toutes les sources',
    allJobs: 'Tous les jobs',
    refresh: 'Rafraîchir',
    messages: 'messages',
    message: 'message',
    noMessages: 'Aucun message.',
    connected: 'Connecté — Hermes est sur vos lunettes',
    selectSource: 'Sélectionnez une source sur le téléphone.',
  },
}
```

**Verify:**
```bash
npx tsc --noEmit
```

---

### Task 3: Create the data fetcher module

**Objective:** Fetch the message store JSON, with config-based filtering

**Files:**
- Create: `hermes-g2/src/data.ts`

```typescript
import type { HermesMessage, MessageStore, G2Config } from './types'

const DATA_URL = '/data.json'
const POLL_MS = 30_000

/**
 * Fetch the full message store from the server.
 */
export async function fetchStore(): Promise<MessageStore | null> {
  try {
    const resp = await fetch(DATA_URL, { cache: 'no-store' })
    if (!resp.ok) return null
    return await resp.json()
  } catch (err) {
    console.error('fetchStore failed:', err)
    return null
  }
}

/**
 * Filter messages by user config.
 */
export function filterMessages(
  store: MessageStore,
  config: G2Config
): HermesMessage[] {
  let msgs = store.messages

  if (config.sourceType !== 'all') {
    msgs = msgs.filter(m => m.source === config.sourceType)
  }

  if (config.sourceLabel) {
    msgs = msgs.filter(m => m.label === config.sourceLabel)
  }

  return msgs.slice(0, config.maxMessages)
}

/**
 * Start polling the data store. Calls onUpdate with filtered messages
 * whenever data changes. Returns stop function.
 */
export function startPolling(
  config: G2Config,
  onUpdate: (msgs: HermesMessage[], store: MessageStore) => void
): () => void {
  let lastHash = ''

  const poll = async () => {
    const store = await fetchStore()
    if (!store) return

    const msgs = filterMessages(store, config)
    const hash = `${msgs.length}:${msgs[0]?.ts || 0}:${config.sourceType}:${config.sourceLabel}`

    if (hash !== lastHash) {
      lastHash = hash
      onUpdate(msgs, store)
    }
  }

  poll()
  const interval = setInterval(poll, POLL_MS)
  return () => clearInterval(interval)
}
```

**Verify:**
```bash
npx tsc --noEmit
```

---

### Task 4: Create the G2 display module

**Objective:** Render message list (Level 0) and detail (Level 1) on G2 glasses

**Files:**
- Create: `hermes-g2/src/display/index.ts`

```typescript
import type { EvenAppBridge } from '@evenrealities/even_hub_sdk'
import {
  CreateStartUpPageContainer,
  RebuildPageContainer,
  ListContainerProperty,
  ListItemContainerProperty,
  TextContainerProperty,
} from '@evenrealities/even_hub_sdk'
import type { HermesMessage } from '../types'

let pageCreated = false
let cachedMessages: HermesMessage[] = []

const SOURCE_TAG: Record<string, string> = {
  cron: 'C', session: 'S', direct: 'D',
}

function fmtTime(ts: number): string {
  const d = new Date(ts)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const MM = String(d.getMonth() + 1).padStart(2, '0')
  return `${dd}/${MM} ${hh}:${mm}`
}

function fmtListItem(msg: HermesMessage): string {
  const tag = SOURCE_TAG[msg.source] || '?'
  const firstLine = msg.body.split('\n')[0]
  const title = firstLine.length > 42
    ? firstLine.substring(0, 40) + '…'
    : firstLine
  return `${fmtTime(msg.ts)} [${tag}] ${title}`
}

/** Level 0: Message list with header */
export function renderMessageList(
  bridge: EvenAppBridge,
  messages: HermesMessage[],
  configLabel: string
): void {
  cachedMessages = messages

  const items = messages.map(fmtListItem)
  const headerText = `Hermes · ${configLabel || 'All'} (${messages.length})`

  const header = new TextContainerProperty({
    containerID: 2,
    containerName: 'hdr',
    content: headerText,
    xPosition: 4,
    yPosition: 0,
    width: 568,
    height: 22,
    isEventCapture: 0,
  })

  if (messages.length === 0) {
    // Empty state — show a text hint
    const empty = new TextContainerProperty({
      containerID: 1,
      containerName: 'empty',
      content: 'No messages.\nSelect a source\non your phone.',
      xPosition: 4,
      yPosition: 60,
      width: 568,
      height: 180,
      isEventCapture: 1,
    })

    if (!pageCreated) {
      bridge.createStartUpPageContainer(
        new CreateStartUpPageContainer({
          containerTotalNum: 1,
          textObject: [empty],
        })
      )
      pageCreated = true
    } else {
      bridge.rebuildPageContainer(
        new RebuildPageContainer({
          containerTotalNum: 1,
          textObject: [empty],
        })
      )
    }
    return
  }

  const list = new ListContainerProperty({
    containerID: 1,
    containerName: 'msgList',
    xPosition: 4,
    yPosition: 24,
    width: 568,
    height: 256,
    isEventCapture: 1,
    itemContainer: new ListItemContainerProperty({
      itemCount: items.length,
      itemWidth: 560,
      isItemSelectBorderEn: 1,
      itemName: items,
    }),
  })

  if (!pageCreated) {
    bridge.createStartUpPageContainer(
      new CreateStartUpPageContainer({
        containerTotalNum: 2,
        textObject: [header],
        listObject: [list],
      })
    )
    pageCreated = true
  } else {
    bridge.rebuildPageContainer(
      new RebuildPageContainer({
        containerTotalNum: 2,
        textObject: [header],
        listObject: [list],
      })
    )
  }
}

/** Level 1: Message detail */
export function renderMessageDetail(
  bridge: EvenAppBridge,
  index: number
): void {
  const msg = cachedMessages[index]
  if (!msg) return

  const dateStr = new Date(msg.ts).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })

  const sourceStr = {
    cron: 'Cron', session: 'Session', direct: 'Direct',
  }[msg.source]

  // Truncate body to ~380 chars for G2 (firmware wraps)
  let body = msg.body
  if (body.length > 380) {
    body = body.substring(0, 377) + '…'
  }

  const content = `${msg.label}\n${sourceStr} · ${dateStr}\n\n${body}`

  const text = new TextContainerProperty({
    containerID: 1,
    containerName: 'detail',
    content,
    xPosition: 4,
    yPosition: 4,
    width: 568,
    height: 276,
    isEventCapture: 1,
  })

  bridge.rebuildPageContainer(
    new RebuildPageContainer({
      containerTotalNum: 1,
      textObject: [text],
    })
  )
}
```

**Verify:**
```bash
npx tsc --noEmit
```

---

### Task 5: Create the input handler module

**Objective:** G2 touch events — tap list item → detail, double-tap → back/exit

**Files:**
- Create: `hermes-g2/src/input.ts`

```typescript
import type { EvenAppBridge } from '@evenrealities/even_hub_sdk'
import { OsEventTypeList } from '@evenrealities/even_hub_sdk'
import { renderMessageDetail } from './display'
import type { NavLevel } from './types'

let level: NavLevel = 0

export function getLevel(): NavLevel { return level }
export function setLevel(l: NavLevel): void { level = l }

export function setupInputHandlers(
  bridge: EvenAppBridge,
  onBackToList: () => void
): () => void {
  return bridge.onEvenHubEvent((event) => {
    const evt = event.listEvent || event.textEvent || event.sysEvent
    if (!evt) return

    let type: OsEventTypeList | undefined
    if (evt.eventType !== undefined) {
      type = typeof evt.eventType === 'number'
        ? evt.eventType
        : OsEventTypeList.fromJson(evt.eventType)
    } else if (event.listEvent) {
      type = OsEventTypeList.CLICK_EVENT
    }

    // Level 0 (list): tap item → detail
    if (level === 0 && event.listEvent && type === OsEventTypeList.CLICK_EVENT) {
      let idx = event.listEvent.currentSelectItemIndex
      if (idx === undefined || idx === null) idx = 0
      level = 1
      renderMessageDetail(bridge, idx)
      return
    }

    // Level 0: double-tap → exit
    if (level === 0 && type === OsEventTypeList.DOUBLE_CLICK_EVENT) {
      bridge.shutDownPageContainer(1)
      return
    }

    // Level 1 (detail): double-tap → back to list
    if (level === 1 && type === OsEventTypeList.DOUBLE_CLICK_EVENT) {
      level = 0
      onBackToList()
      return
    }
  })
}
```

**Verify:**
```bash
npx tsc --noEmit
```

---

### Task 6: Create the config module

**Objective:** Read/write user config from localStorage, with phone UI sync

**Files:**
- Create: `hermes-g2/src/config.ts`

```typescript
import { DEFAULT_CONFIG } from './types'
import type { G2Config } from './types'

const STORAGE_KEY = 'hermes-g2-config'

/** Load config from localStorage, merging with defaults */
export function loadConfig(): G2Config {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_CONFIG }
    const parsed = JSON.parse(raw)
    return { ...DEFAULT_CONFIG, ...parsed }
  } catch {
    return { ...DEFAULT_CONFIG }
  }
}

/** Save config to localStorage. Fires 'storage' event in other contexts. */
export function saveConfig(config: G2Config): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
}

/** Watch for config changes from the phone UI (cross-context). */
export function onConfigChange(
  callback: (config: G2Config) => void
): () => void {
  const handler = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY && e.newValue) {
      try {
        const config = JSON.parse(e.newValue)
        callback({ ...DEFAULT_CONFIG, ...config })
      } catch { /* ignore parse errors */ }
    }
  }

  // storage event: fires in OTHER browsing contexts when localStorage changes
  window.addEventListener('storage', handler)

  // Belt-and-suspenders: also poll every 2s for WebView quirks
  let lastRaw = localStorage.getItem(STORAGE_KEY)
  const pollInterval = setInterval(() => {
    const current = localStorage.getItem(STORAGE_KEY)
    if (current && current !== lastRaw) {
      lastRaw = current
      try {
        const config = JSON.parse(current)
        callback({ ...DEFAULT_CONFIG, ...config })
      } catch { /* ignore */ }
    }
  }, 2000)

  return () => {
    window.removeEventListener('storage', handler)
    clearInterval(pollInterval)
  }
}
```

**Verify:**
```bash
npx tsc --noEmit
```

---

### Task 7: Create main.ts — wire everything together

**Objective:** Bridge init, config-driven polling, G2 rendering, phone↔G2 sync

**Files:**
- Create: `hermes-g2/src/main.ts`

```typescript
import { waitForEvenAppBridge } from '@evenrealities/even_hub_sdk'
import { renderMessageList } from './display'
import { setupInputHandlers, getLevel, setLevel } from './input'
import { startPolling, fetchStore, filterMessages } from './data'
import { loadConfig, onConfigChange } from './config'
import type { G2Config, AppState } from './types'

const state: AppState = {
  level: 0,
  detailIndex: 0,
}

let stopPolling: (() => void) | null = null
let stopConfigWatch: (() => void) | null = null
let bridge: any = null

/** Start the data pipeline with current config */
async function startDataPipeline(config: G2Config) {
  if (stopPolling) stopPolling()

  stopPolling = startPolling(config, (msgs) => {
    // Update phone UI message count
    const countEl = document.getElementById('msgCount')
    if (countEl) {
      countEl.textContent = `${msgs.length} message${msgs.length !== 1 ? 's' : ''}`
    }

    // Render on G2 if we're in list view
    if (getLevel() === 0 && bridge) {
      const label = config.sourceLabel
        || (config.sourceType !== 'all' ? config.sourceType : 'All')
      renderMessageList(bridge, msgs, label)
    }
  })
}

/** Called when user changes config from phone UI */
function handleConfigChange(newConfig: G2Config) {
  // Update phone dropdowns to match
  updatePhoneUI(newConfig)

  // Reset G2 to list view and restart data pipeline
  setLevel(0)
  startDataPipeline(newConfig)
}

/** Phone UI: populate source/job dropdowns from store data */
async function populateDropdowns(config: G2Config) {
  const store = await fetchStore()
  if (!store) return

  const sources = store.sources || []

  // Populate source type dropdown
  const sourceSelect = document.getElementById('sourceSelect') as HTMLSelectElement
  if (sourceSelect && sourceSelect.options.length <= 1) {
    // Only populate once
    const types: Array<{value: string; label: string}> = [
      { value: 'all', label: 'All Sources' },
      { value: 'cron', label: 'Cron Jobs' },
      { value: 'session', label: 'Sessions' },
      { value: 'direct', label: 'Direct' },
    ]
    types.forEach(t => {
      const opt = document.createElement('option')
      opt.value = t.value
      opt.textContent = t.label
      sourceSelect.appendChild(opt)
    })
  }

  // Populate job dropdown (filtered by source type)
  updateJobDropdown(sources, config)
}

/** Phone UI: filter and populate job dropdown */
function updateJobDropdown(sources: any[], config: G2Config) {
  const jobSelect = document.getElementById('jobSelect') as HTMLSelectElement
  if (!jobSelect) return

  // Rebuild options
  jobSelect.innerHTML = '<option value="">All Jobs</option>'

  const filtered = config.sourceType === 'all'
    ? sources
    : sources.filter((s: any) => s.type === config.sourceType)

  // Deduplicate by label
  const seen = new Set<string>()
  filtered.forEach((s: any) => {
    if (!seen.has(s.label)) {
      seen.add(s.label)
      const opt = document.createElement('option')
      opt.value = s.label
      opt.textContent = `${s.label} (${s.count})`
      jobSelect.appendChild(opt)
    }
  })

  jobSelect.value = config.sourceLabel || ''
}

/** Phone UI: update dropdowns and count to match config */
function updatePhoneUI(config: G2Config) {
  const sourceSelect = document.getElementById('sourceSelect') as HTMLSelectElement
  const jobSelect = document.getElementById('jobSelect') as HTMLSelectElement

  if (sourceSelect) sourceSelect.value = config.sourceType
  if (jobSelect) jobSelect.value = config.sourceLabel || ''
}

/** Phone UI: bind dropdown change events */
function bindPhoneUI() {
  const sourceSelect = document.getElementById('sourceSelect') as HTMLSelectElement
  const jobSelect = document.getElementById('jobSelect') as HTMLSelectElement
  const refreshBtn = document.getElementById('refreshBtn')

  const applyConfig = () => {
    const config = loadConfig()
    config.sourceType = (sourceSelect?.value || 'all') as G2Config['sourceType']
    config.sourceLabel = jobSelect?.value || ''
    saveConfig(config)
    // saveConfig fires storage event → handleConfigChange picks it up
  }

  sourceSelect?.addEventListener('change', async () => {
    // When source type changes, reset job dropdown to "All"
    if (jobSelect) jobSelect.value = ''
    // Repopulate job dropdown
    const store = await fetchStore()
    if (store) updateJobDropdown(store.sources || [], {
      ...loadConfig(),
      sourceType: sourceSelect.value as G2Config['sourceType'],
    })
    applyConfig()
  })

  jobSelect?.addEventListener('change', () => {
    applyConfig()
  })

  refreshBtn?.addEventListener('click', async () => {
    const config = loadConfig()
    const store = await fetchStore()
    if (store) {
      populateDropdowns(config)
      // Force re-render
      saveConfig(config) // triggers storage event → re-render
    }
  })
}

async function main(): Promise<void> {
  // Phone UI: bind dropdowns immediately (works in browser and WebView)
  bindPhoneUI()

  // Populate dropdowns from initial data
  const initConfig = loadConfig()
  populateDropdowns(initConfig)

  // Watch for config changes from companion app (cross-context)
  stopConfigWatch = onConfigChange(handleConfigChange)

  try {
    bridge = await waitForEvenAppBridge()

    // Hide phone UI, show G2 status
    const g2status = document.getElementById('g2-status')
    const phoneUI = document.getElementById('phone-ui')
    if (g2status) g2status.style.display = 'block'
    if (phoneUI) phoneUI.style.display = 'none'

    // Setup G2 input
    const cleanupInput = setupInputHandlers(bridge, async () => {
      // Back to list — re-render
      const config = loadConfig()
      const store = await fetchStore()
      if (store) {
        const msgs = filterMessages(store, config)
        const label = config.sourceLabel
          || (config.sourceType !== 'all' ? config.sourceType : 'All')
        renderMessageList(bridge, msgs, label)
      }
    })

    // Start data pipeline with current config
    startDataPipeline(initConfig)
  } catch (err) {
    console.log('Hermes G2: Bridge not available (browser mode)')
    console.log('Open this app on your G2 glasses to activate the display.')
  }
}

// Need saveConfig reference
import { saveConfig } from './config'

main()
```

**Verify:**
```bash
npx tsc --noEmit
```

---

### Task 8: Create the companion phone UI (index.html)

**Objective:** Full companion app HTML with even-toolkit design tokens, source/job selectors, message count, refresh button

**Files:**
- Create: `hermes-g2/index.html`

```html
<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
  <title>Hermes G2</title>

  <!-- even-toolkit CSS tokens dark theme -->
  <style id="tokens-dark">
    :root {
      --color-bg: #0c0a07;
      --color-surface: #161310;
      --color-border: #2a2520;
      --color-text: #f0ebe3;
      --color-text-dim: #8a7f72;
      --color-text-muted: #5a524a;
      --color-accent: #4a9eff;
      --color-input-bg: rgba(255,255,255,0.08);
      --radius: 6px;
      --spacing-sm: 8px;
      --spacing-md: 12px;
      --spacing-lg: 16px;
      --font-stack: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      --select-chevron: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%238a7f72' d='M3 4.5l3 3 3-3'/%3E%3C/svg%3E");
    }
  </style>

  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: var(--font-stack);
      font-size: 15px;
      background: var(--color-bg);
      color: var(--color-text);
      min-height: 100dvh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-start;
      padding: 20px 16px;
      -webkit-font-smoothing: antialiased;
    }

    /* ── G2 Status Bar ── */
    #g2-status {
      display: none;
      width: 100%;
      text-align: center;
      padding: 8px;
      background: var(--color-surface);
      border: 1px solid var(--color-accent);
      border-radius: var(--radius);
      color: var(--color-accent);
      font-size: 13px;
      margin-bottom: 16px;
    }

    /* ── Phone UI ── */
    #phone-ui {
      width: 100%;
      max-width: 360px;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .app-header {
      text-align: center;
      margin-bottom: 4px;
    }
    .app-title {
      font-size: 28px;
      font-weight: 700;
      letter-spacing: -0.3px;
    }
    .app-subtitle {
      font-size: 13px;
      color: var(--color-text-dim);
      letter-spacing: -0.13px;
      margin-top: 2px;
    }

    /* ── Settings Group ── */
    .settings-group {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
      overflow: hidden;
    }
    .settings-group > * + * {
      border-top: 1px solid var(--color-border);
    }
    .setting-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 16px;
      gap: 12px;
    }
    .setting-label {
      font-size: 13px;
      font-weight: 600;
      color: var(--color-text-dim);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      flex-shrink: 0;
    }

    /* ── Select Dropdowns ── */
    .hermes-select {
      flex: 1;
      appearance: none;
      -webkit-appearance: none;
      background: var(--color-input-bg);
      color: var(--color-text);
      border: 1px solid var(--color-border);
      border-radius: 4px;
      padding: 8px 32px 8px 10px;
      font-family: var(--font-stack);
      font-size: 14px;
      font-weight: 400;
      cursor: pointer;
      background-image: var(--select-chevron);
      background-repeat: no-repeat;
      background-position: right 10px center;
      max-width: 200px;
    }
    .hermes-select:focus-visible {
      outline: 1px solid var(--color-accent);
      outline-offset: -1px;
    }

    /* ── Stats Row ── */
    .stats-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .msg-count {
      font-size: 13px;
      color: var(--color-text-dim);
      letter-spacing: -0.13px;
    }

    /* ── Button ── */
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 8px 16px;
      border-radius: var(--radius);
      font-family: var(--font-stack);
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      border: 1px solid var(--color-border);
      background: var(--color-surface);
      color: var(--color-text);
      transition: opacity 0.15s;
      -webkit-tap-highlight-color: transparent;
    }
    .btn:active { opacity: 0.7; }

    /* ── Message Preview (when no bridge — browser mode) ── */
    .preview-section {
      margin-top: 4px;
    }
    .section-title {
      font-size: 11px;
      font-weight: 600;
      color: var(--color-text-dim);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }
    .msg-preview {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
      padding: 12px 14px;
      font-size: 13px;
      line-height: 1.5;
      max-height: 200px;
      overflow-y: auto;
    }
    .msg-preview-item {
      padding: 6px 0;
      border-bottom: 1px solid var(--color-border);
    }
    .msg-preview-item:last-child { border-bottom: none; }
    .msg-preview-meta {
      font-size: 11px;
      color: var(--color-text-muted);
    }
    .msg-preview-body {
      color: var(--color-text-dim);
      margin-top: 2px;
      white-space: pre-wrap;
    }
    .empty-state {
      text-align: center;
      color: var(--color-text-muted);
      padding: 24px 0;
      font-size: 14px;
    }

    /* ── Footer ── */
    .app-footer {
      text-align: center;
      font-size: 11px;
      color: var(--color-text-muted);
      padding-bottom: 12px;
      letter-spacing: -0.11px;
    }
  </style>
</head>
<body>

  <!-- G2 Connected Status (hidden by default, shown when bridge available) -->
  <div id="g2-status">⚡ Connected — Hermes is on your glasses</div>

  <!-- Phone UI — always visible; hidden when G2 bridge is active -->
  <div id="phone-ui">
    <div class="app-header">
      <div class="app-title">⚡ Hermes G2</div>
      <div class="app-subtitle">Your Agent, on your glasses.</div>
    </div>

    <!-- Source Selection -->
    <div class="settings-group">
      <div class="setting-row">
        <span class="setting-label">Source</span>
        <select id="sourceSelect" class="hermes-select">
          <option value="all">All Sources</option>
          <option value="cron">Cron Jobs</option>
          <option value="session">Sessions</option>
          <option value="direct">Direct</option>
        </select>
      </div>
      <div class="setting-row">
        <span class="setting-label">Job</span>
        <select id="jobSelect" class="hermes-select">
          <option value="">All Jobs</option>
        </select>
      </div>
    </div>

    <!-- Stats + Refresh -->
    <div class="stats-row">
      <span class="msg-count" id="msgCount">0 messages</span>
      <button class="btn" id="refreshBtn">Refresh now</button>
    </div>

    <!-- Message Preview (browser mode — hidden when G2 is active) -->
    <div class="preview-section" id="previewSection">
      <div class="section-title">Latest Messages</div>
      <div class="msg-preview" id="msgPreview">
        <div class="empty-state">Loading…</div>
      </div>
    </div>

    <div class="app-footer">v<span id="appVersion">0.1.0</span></div>
  </div>

  <script>
    var APP_VERSION = '0.1.0';
    document.getElementById('appVersion').textContent = APP_VERSION;
  </script>
  <script type="module" src="/src/main.ts"></script>
</body>
</html>
```

---

### Task 9: Populate message preview in browser mode

**Objective:** When running in a regular browser (no G2 bridge), show messages in the phone UI preview section

**Add to main.ts** (after the `catch` block in main()):

```typescript
  // Browser mode — populate message preview
  const store = await fetchStore()
  if (store) {
    const msgs = filterMessages(store, initConfig)
    renderPreview(msgs)
  }
```

Add a `renderPreview` function:

```typescript
/** Render messages in the phone UI preview section */
function renderPreview(msgs: HermesMessage[]): void {
  const container = document.getElementById('msgPreview')
  if (!container) return

  if (msgs.length === 0) {
    container.innerHTML = '<div class="empty-state">No messages.</div>'
    return
  }

  const dateStr = (ts: number) => {
    const d = new Date(ts)
    return d.toLocaleDateString('fr-FR', { day:'2-digit', month:'2-digit' })
      + ' ' + d.toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' })
  }

  let html = ''
  for (const m of msgs.slice(0, 10)) {
    const bodyPreview = m.body.substring(0, 100)
    html += `<div class="msg-preview-item">
      <div class="msg-preview-meta">${dateStr(m.ts)} · ${m.label}</div>
      <div class="msg-preview-body">${escapeHtml(bodyPreview)}</div>
    </div>`
  }
  container.innerHTML = html
}

function escapeHtml(s: string): string {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
}
```

---

### Task 10: Create the sample data.json

**Objective:** Realistic test data with multiple sources

**Files:**
- Create: `hermes-g2/public/data.json`

```json
{
  "messages": [
    {
      "ts": 1718366400000,
      "source": "cron",
      "label": "veille-akiya-japon",
      "body": "🏠 VEILLE AKIYA — 14 JUIN 2026\n\n3 nouvelles annonces aujourd'hui.\n\n1. Maison traditionnelle — Kyoto, Shimogyo-ku\n   8,2M¥ (508k€) — 120m², 4DK\n\n2. Kominka rénovée — Kanazawa\n   5,5M¥ (341k€) — 90m², 3DK\n\n3. Akiya avec terrain — Shizuoka, Ito\n   3,2M¥ (198k€) — 80m², 2LDK"
    },
    {
      "ts": 1718350000000,
      "source": "cron",
      "label": "veille-vols-japon",
      "body": "✈️ VOLS JAPON — 14 JUIN\n\nLyon → Tokyo : 884€ (SAS, 1 escale)\nGenève → Tokyo : 750€ (China Eastern)\n\nPrix en hausse vs hier. Septembre recommandé."
    },
    {
      "ts": 1718345000000,
      "source": "cron",
      "label": "veille-akiya-japon",
      "body": "🏠 VEILLE AKIYA — 13 JUIN 2026 (soir)\n\n2 nouvelles annonces.\n\n1. Appartement — Tokyo, Setagaya\n   12M¥ (744k€) — 65m², 2LDK\n\n2. Maison — Nagano, Azumino\n   4,8M¥ (298k€) — 110m², 5DK"
    },
    {
      "ts": 1718340000000,
      "source": "session",
      "label": "Dashboard Plugin",
      "body": "📋 Session Summary: Dashboard Plugin\n\nBuilt a new React plugin for the Hermes Dashboard.\n3 API endpoints, 2 pages.\n\nFiles:\n- plugins/mission-control/dashboard/src/pages/CronHistory.tsx\n- plugins/mission-control/api/cron_history.py"
    },
    {
      "ts": 1718330000000,
      "source": "session",
      "label": "EvenHub G2 Dev",
      "body": "🦜 Session: Bad Parrot v0.2.3\n\nAdded swipe navigation for Level 2 detail view.\nFixed CLICK_EVENT=0 falsy bug in input handler.\n\nFiles:\n- src/input.ts\n- src/display/index.ts"
    },
    {
      "ts": 1718320000000,
      "source": "direct",
      "label": "Hermes",
      "body": "Rappel : la gateway est down depuis 2h.\nRelancer avec : hermes gateway start"
    }
  ],
  "sources": [
    { "type": "cron", "label": "veille-akiya-japon", "count": 2 },
    { "type": "cron", "label": "veille-vols-japon", "count": 1 },
    { "type": "session", "label": "Dashboard Plugin", "count": 1 },
    { "type": "session", "label": "EvenHub G2 Dev", "count": 1 },
    { "type": "direct", "label": "Hermes", "count": 1 }
  ]
}
```

**Step: Verify fetch works**

```bash
cd hermes-g2
npx vite --host 0.0.0.0 --port 5174 &
sleep 3
curl -s http://localhost:5174/data.json | python3 -m json.tool | head -5
kill %1
```

---

### Task 11: Create the update script for Hermes cron jobs

**Objective:** A script that Hermes cron jobs pipe output into, which appends to data.json

**Files:**
- Create: `hermes-g2/scripts/update-data.sh`

```bash
#!/usr/bin/env bash
# update-data.sh — Append a Hermes message to the G2 data store
# Usage: echo "message" | update-data.sh "cron" "job-name"
# Called as post-processing step in Hermes cron jobs.

set -euo pipefail

SOURCE="${1:-cron}"
LABEL="${2:-unknown}"
DATA_FILE="${3:-/Users/gael/Documents/GitHub/EvenHub/hermes-g2/public/data.json}"

BODY=$(cat)

python3 -c "
import json, os
from datetime import datetime, timezone

path = '${DATA_FILE}'
source = '${SOURCE}'
label = '${LABEL}'
body = '''${BODY}'''

# Load
if os.path.exists(path):
    with open(path) as f:
        data = json.load(f)
else:
    data = {'messages': [], 'sources': []}

# Add message
data['messages'].insert(0, {
    'ts': int(datetime.now(timezone.utc).timestamp() * 1000),
    'source': source,
    'label': label,
    'body': body,
})

# Trim messages (keep last 100)
data['messages'] = data['messages'][:100]

# Rebuild sources index
from collections import Counter
source_counts = Counter()
for m in data['messages']:
    source_counts[(m['source'], m['label'])] += 1

data['sources'] = [
    {'type': t, 'label': l, 'count': c}
    for (t, l), c in sorted(source_counts.items())
]

# Atomic write
tmp = path + '.tmp'
with open(tmp, 'w') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)
os.replace(tmp, path)
"
```

```bash
chmod +x hermes-g2/scripts/update-data.sh
```

---

### Task 12: Build, QR sideload, and test on hardware

**Objective:** Full build → QR → G2 hardware test cycle

**Step 1: Build**
```bash
cd /Users/gael/Documents/GitHub/EvenHub/hermes-g2
npx vite build
```

**Step 2: Verify dist/**
```bash
ls dist/
# Expected: index.html, assets/index.js, data.json (from public/)
```

**Step 3: Start dev server + QR**
```bash
cd hermes-g2
npx vite --host 0.0.0.0 --port 5174 &
IP=$(ipconfig getifaddr en0 2>/dev/null || echo "192.168.1.x")
mkdir -p QRcode
evenhub qr --url "http://${IP}:5174" > QRcode/v0.1.0.txt
echo "Scan: http://${IP}:5174"
```

**Step 4: Hardware test checklist**
- [ ] Scan QR → app loads in Even Realities App
- [ ] Phone UI shows source/job dropdowns populated
- [ ] Select "Cron Jobs" → job dropdown shows "veille-akiya-japon" and "veille-vols-japon"
- [ ] Select specific job → message count updates
- [ ] G2 glasses: message list renders
- [ ] G2: tap item → detail view
- [ ] G2: double-tap → back to list
- [ ] G2: double-tap on Level 0 → exit dialog
- [ ] Change source on phone → G2 updates (via localStorage storage event)

**Step 5: Package**
```bash
evenhub pack app.json dist/ -o hermes-g2.ehpk
```

---

## Verification Checklist

- [ ] `npx tsc --noEmit` — zero errors
- [ ] `npx vite build` — succeeds, `dist/` has `index.html`, `assets/index.js`, `data.json`
- [ ] `evenhub pack` — succeeds, produces `.ehpk`
- [ ] Phone UI: source/job dropdowns populate from `data.json`
- [ ] Phone UI: changing source filters job dropdown
- [ ] Phone UI: changing selection updates message count
- [ ] Phone UI: "Refresh now" re-fetches and updates
- [ ] G2: message list renders with filtered messages
- [ ] G2: header shows source label + count
- [ ] G2: tap → detail view with full body
- [ ] G2: double-tap → back to list
- [ ] G2: double-tap on Level 0 → exit dialog with `shutDownPageContainer(1)`
- [ ] Changing config on phone → G2 re-renders (within 2s polling or instant via storage event)
- [ ] `update-data.sh` appends messages atomically

---

## Risk & Tradeoffs

| Risk | Mitigation |
|------|-----------|
| G2 list limit (20 items) | `config.maxMessages` caps it; phone UI shows full preview |
| `storage` event not firing in WebView | 2s localStorage polling fallback in config.ts |
| Vite dev server must stay running | Document; for production use `.ehpk` with embedded `data.json` or fetch from API |
| Multiple cron writes concurrent | `os.replace()` is atomic on macOS |
| Phone WebView cache (pitfall #9) | `cache: 'no-store'` on fetch; kill Vite + Even App between builds |
| Dropdown empty on first load | `populateDropdowns()` called in init; "Refresh now" button as fallback |

---

## Future: Phase 2 — Conversation Mode

Same architecture as Phase 1 plan. The companion phone UI would add a "Chat" tab where the user types a message → Hermes API → response displayed on G2. Voice input via G2 microphone mapped to a dedicated gesture.

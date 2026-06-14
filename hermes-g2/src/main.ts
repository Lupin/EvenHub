// ── Hermes G2 — Main Entry Point ────────────────────────────
// Wires together bridge init, data pipeline, config sync,
// error state management, phone UI bindings, and theme.

import { waitForEvenAppBridge, type EvenAppBridge, type EvenHubEvent } from '@evenrealities/even_hub_sdk'
import type {
  G2Config,
  HermesMessage,
  MessageStore,
  HealthResponse,
  ErrorState,
  AppState,
  SourceInfo,
  ConnectionStatus,
} from './types'
import { DEFAULT_CONFIG, T } from './types'

function _log(msg: string): void {
  const el = document.getElementById('message-preview')
  if (el) {
    const item = document.createElement('div')
    item.className = 'msg-preview-item'
    item.innerHTML = '<span class="msg-preview-meta" style="color:#8a7f72">⚡ ' + msg + '</span>'
    el.appendChild(item)
  }
}
;(window as any).__log = _log

import {
  initConfig,
  loadConfig,
  saveConfig,
  loadTheme,
  saveTheme,
  getLastSeen,
  setLastSeen,
  isFirstLaunch,
  markLaunched,
  onConfigChange,
} from './config'
import {
  fetchStore,
  filterMessages,
  startPolling,
  getApiUrl,
} from './data'
import {
  renderLoading,
  renderMessageList,
  renderMessageDetail,
  resetPageState,
} from './display/index'
import { setupInputHandlers } from './input'

// ── Module-level state ──────────────────────────────────────

/** The EvenAppBridge instance (null when in phone-only mode) */
let bridge: EvenAppBridge | null = null

/** Current configuration */
let currentConfig: G2Config = { ...DEFAULT_CONFIG }

/** Current app state (level, detail index) */
let appState: AppState = {
  level: 0,
  detailIndex: 0,
}

/** Connection status */
let connectionStatus: ConnectionStatus = 'checking'

/** Error state with consecutive failure tracking */
let errorState: ErrorState = {
  message: '',
  retryable: false,
  consecutiveFailures: 0,
}

/** Last fetched message store (cached across failures) */
let lastStore: MessageStore | null = null

/** Last filtered messages (cached across failures) */
let lastMessages: HermesMessage[] = []

/** Active poller stop function */
let stopPolling: (() => void) | null = null

/** Config change listener cleanup */
let stopConfigListener: (() => void) | null = null

/** System theme media query listener cleanup */
let stopThemeMediaListener: (() => void) | null = null

// ── 1. Main entry point ─────────────────────────────────────

export async function main(): Promise<void> {
  // (a) Bind phone UI immediately — phone UI always works, even without bridge
  bindPhoneUI()

  // Load initial config for phone UI (after bindPhoneUI so IP auto-detect runs)
  currentConfig = await loadConfig()

  // Ensure server IP and port are correct (override any stale localStorage)
  if (!currentConfig.server.ip) {
    currentConfig.server.ip = window.location.hostname
  }
  // Always force port to 8765 (our standalone API server)
  currentConfig.server.port = 8765
  await saveConfig(currentConfig)

  // Also update the input fields in the DOM
  const ipEl = document.getElementById('server-ip') as HTMLInputElement | null
  const portEl = document.getElementById('server-port') as HTMLInputElement | null
  if (ipEl) ipEl.value = currentConfig.server.ip
  if (portEl) portEl.value = String(currentConfig.server.port)

  // Populate dropdowns from initial config
  await populateDropdowns(currentConfig)
  // (c) Start config change listener
  stopConfigListener = onConfigChange(() => {
    void handleConfigChangeCallback()
  })

  // (d) Try to connect to EvenAppBridge
  try {
    bridge = await waitForEvenAppBridge()
    // config.ts EvenAppBridge interface has setLocalStorage→Promise<void>,
    // SDK EvenAppBridge has setLocalStorage→Promise<boolean>.
    // Runtime behavior is identical; the return value is never used in config.ts.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    initConfig(bridge as any)
    // Save current config to bridge storage so it's consistent
    currentConfig.server.port = 8765
    await saveConfig(currentConfig)

    // Reload config through bridge storage
    currentConfig = await loadConfig()
    // Show G2 status bar, hide phone UI
    showG2Mode()

    // Check first launch
    const firstLaunch = await isFirstLaunch()
    if (firstLaunch) {
      // Show loading on G2 glasses briefly, then switch to list when data arrives
      await renderLoading(bridge)
      await markLaunched()
    }

    // Start the data pipeline — this will update G2 when data arrives
    await startDataPipeline(currentConfig)
    // Show loading state on G2 while waiting for first data
    if (appState.level === -1) {
      await renderLoading(bridge)
    }

    // G2 navigation: numbered list, swipe=page, tap=detail of 1st item on page
    let g2Mode: 'list' | 'detail' = 'list'
    let g2Page = 0
    let g2Idx = 0
    const PAGE = 6

    function g2Label(): string {
      const cfg = currentConfig
      return cfg.sourceLabel || (cfg.sourceType !== 'all' ? cfg.sourceType : 'All')
    }

    function g2ShowList(): void {
      if (!bridge || !lastMessages) return
      void renderMessageList(bridge, lastMessages, g2Label(), Date.now(), g2Idx)
    }

    function g2ShowDetail(idx: number): void {
      if (!bridge || !lastMessages) return
      g2Idx = idx
      void renderMessageDetail(bridge, idx)
    }

    setupInputHandlers(bridge,
      () => g2Mode,
      () => {
        // list tap → open detail of the selected item
        if (g2Mode === 'list') { g2Mode = 'detail'; g2ShowDetail(g2Idx) }
      },
      () => {
        // swipe up → cursor up (list) or prev msg (detail)
        if (g2Mode === 'detail') { g2Idx = Math.max(0, g2Idx - 1); g2ShowDetail(g2Idx) }
        else { g2Idx = Math.max(0, g2Idx - 1); g2ShowList() }
      },
      () => {
        // swipe down → cursor down (list) or next msg (detail)
        if (g2Mode === 'detail') { g2Idx = Math.min((lastMessages?.length||1)-1, g2Idx+1); g2ShowDetail(g2Idx) }
        else { g2Idx = Math.min((lastMessages?.length||1)-1, g2Idx+1); g2ShowList() }
      },
      () => { g2Mode = 'list'; g2ShowList() },
      () => { if (bridge) bridge.shutDownPageContainer(1) },
    )
  } catch (err: any) {
    // Bridge unavailable OR main() error — phone-only mode
    bridge = null
    showPhoneOnlyMode()
    console.error('[hermes-g2] bridge/main error:', err?.message || err)
    var el = document.getElementById('message-preview')
    if (el) el.innerHTML = '<div class="msg-preview-item"><span class="msg-preview-meta" style="color:#ef5350">✗ ' + (err?.message || err || 'Bridge unavailable') + '</span></div>'

    // Still try to populate preview
    try { await populateMessagePreview() } catch {}
  }
}

// ── 2. handleConfigChange ───────────────────────────────────

/** Callback wrapper for config changes (async wrapper for sync listener) */
async function handleConfigChangeCallback(): Promise<void> {
  const newConfig = await loadConfig()
  handleConfigChange(newConfig)
}

function handleConfigChange(newConfig: G2Config): void {
  currentConfig = newConfig

  // Update phone UI dropdowns to match new config
  updateSourceSelect(newConfig.sourceType)
  void updateJobDropdownFromConfig(newConfig)

  // Reset G2 to list view
  appState.level = 0

  // Restart data pipeline with new config
  void startDataPipeline(newConfig)
}

// ── 3. startDataPipeline ────────────────────────────────────

async function startDataPipeline(config: G2Config): Promise<void> {
  // Stop existing poller if any
  if (stopPolling) {
    stopPolling()
    stopPolling = null
  }

  // Reset failure counter on pipeline restart
  errorState.consecutiveFailures = 0

  // Start polling
  stopPolling = startPolling(config, onUpdate, onHealth)
}

/** Called on each successful inbox fetch */
function onUpdate(msgs: HermesMessage[], store: MessageStore): void {
  // Cache data across failures
  lastMessages = msgs
  lastStore = store

  // Reset failure counter on success
  errorState.consecutiveFailures = 0
  clearError()

  // Update connection status
  connectionStatus = 'connected'
  updateConnectionStatusDOM('connected')

  // Only update G2 list if we're actually in list mode (don't interrupt detail view)
  if (bridge && appState.level === 0) {
    void getLastSeen().then((lastSeenTs) => {
      if (bridge && appState.level === 0) {
        void renderMessageList(bridge, msgs, configLabel(currentConfig), lastSeenTs)
      }
    })
  }

  // Populate phone preview (always)
  renderPreview(msgs)
}

/** Called on each health check */
function onHealth(health: HealthResponse): void {
  // Only update status if inbox hasn't already set it to connected
  if (connectionStatus === 'connected') return

  if (health.status === 'ok') {
    connectionStatus = 'connected'
    updateConnectionStatusDOM('connected')
  } else {
    connectionStatus = 'disconnected'
    updateConnectionStatusDOM('disconnected')
  }
  if (!health.gateway_online) {
    showError(T.en.gatewayOffline, false)
  }
}

/** Called on fetch failure (increments consecutive failures, show error after 3) */
function onFetchFailure(errMsg: string): void {
  errorState.consecutiveFailures++
  if (errorState.consecutiveFailures >= 3) {
    showError(T.en.dashboardOffline, true)
  } else if (errorState.consecutiveFailures === 1) {
    showError(T.en.networkError, false)
  }
  // Keep cached data visible — never clear UI
}

// ── 4. bindPhoneUI ──────────────────────────────────────────

function bindPhoneUI(): void {
  // Source select change → update config, repopulate job dropdown
  const sourceSelect = document.getElementById('source-select') as HTMLSelectElement | null
  if (sourceSelect) {
    sourceSelect.addEventListener('change', async () => {
      const newType = sourceSelect.value as G2Config['sourceType']
      currentConfig.sourceType = newType
      currentConfig.sourceLabel = ''
      await saveConfig(currentConfig)
      await updateJobDropdownFromConfig(currentConfig)
    })
  }

  // Job select change → update config
  const jobSelect = document.getElementById('job-select') as HTMLSelectElement | null
  if (jobSelect) {
    jobSelect.addEventListener('change', async () => {
      currentConfig.sourceLabel = jobSelect.value
      await saveConfig(currentConfig)
    })
  }

  // Refresh button → fetch store + re-render
  const refreshBtn = document.getElementById('refresh-btn')
  if (refreshBtn) {
    refreshBtn.addEventListener('click', async () => {
      if (bridge) {
        const store = await fetchStore(currentConfig)
        if (store) {
          const msgs = filterMessages(store, currentConfig)
          onUpdate(msgs, store)
        } else {
          onFetchFailure('Manual refresh failed')
        }
      } else {
        await populateMessagePreview()
      }
    })
  }

  // Theme select change → saveTheme + applyTheme
  const themeSelect = document.getElementById('theme-select') as HTMLSelectElement | null
  if (themeSelect) {
    themeSelect.addEventListener('change', async () => {
      const theme = themeSelect.value as 'system' | 'dark' | 'light'
      await saveTheme(theme)
      applyTheme(theme)
    })
  }

  // Server IP input → update config
  const serverIpInput = document.getElementById('server-ip') as HTMLInputElement | null
  if (serverIpInput) {
    // Auto-detect from window.location
    if (!currentConfig.server.ip) {
      currentConfig.server.ip = window.location.hostname
      serverIpInput.value = currentConfig.server.ip
      saveConfig(currentConfig)
    } else {
      serverIpInput.value = currentConfig.server.ip
    }
    serverIpInput.addEventListener('change', async () => {
      currentConfig.server.ip = serverIpInput.value
      await saveConfig(currentConfig)
    })
  }

  // Port input → update config
  const serverPortInput = document.getElementById('server-port') as HTMLInputElement | null
  if (serverPortInput) {
    serverPortInput.value = String(currentConfig.server.port || 9119)
    serverPortInput.addEventListener('change', async () => {
      const port = parseInt(serverPortInput.value, 10) || 9119
      currentConfig.server.port = port
      await saveConfig(currentConfig)
    })
  }

  // Apply initial theme from loadTheme()
  void loadTheme().then((theme) => {
    applyTheme(theme)
    if (themeSelect) {
      themeSelect.value = theme
    }
  })
}

// ── 5. populateDropdowns ────────────────────────────────────

async function populateDropdowns(config: G2Config): Promise<void> {
  const store = await fetchStore(config)
  if (!store) return

  lastStore = store

  // Populate source type dropdown (if not already populated)
  const sourceSelect = document.getElementById('source-select') as HTMLSelectElement | null
  if (sourceSelect && sourceSelect.options.length <= 1) {
    // Clear existing (keep first "all" option if present)
    while (sourceSelect.options.length > 1) {
      sourceSelect.remove(1)
    }

    // Get unique source types from store
    const types = new Set(store.sources.map((s) => s.type))
    const typeLabels: Record<string, string> = {
      cron: 'Cron Jobs',
      session: 'Sessions',
      direct: 'Direct',
    }
    for (const t of types) {
      const opt = document.createElement('option')
      opt.value = t
      opt.textContent = `${typeLabels[t] || t} (${store.sources.filter((s) => s.type === t).reduce((sum, s) => sum + s.count, 0)})`
      sourceSelect.appendChild(opt)
    }
  }

  // Set current value
  if (sourceSelect) {
    sourceSelect.value = config.sourceType
  }

  // Populate job dropdown
  await updateJobDropdown(store.sources, config)
}

// ── 6. updateJobDropdown ────────────────────────────────────

function updateJobDropdown(sources: SourceInfo[], config: G2Config): void {
  const jobSelect = document.getElementById('job-select') as HTMLSelectElement | null
  if (!jobSelect) return

  // Clear existing options (keep first "All Jobs" option)
  while (jobSelect.options.length > 1) {
    jobSelect.remove(1)
  }

  // Filter by source type
  let filtered = sources
  if (config.sourceType !== 'all') {
    filtered = sources.filter((s) => s.type === config.sourceType)
  }

  // Deduplicate by label, show count
  const seen = new Map<string, number>()
  for (const s of filtered) {
    const existing = seen.get(s.label) || 0
    seen.set(s.label, existing + s.count)
  }

  for (const [label, count] of seen) {
    const opt = document.createElement('option')
    opt.value = label
    opt.textContent = `${label} (${count})`
    jobSelect.appendChild(opt)
  }

  // Restore selection
  if (config.sourceLabel) {
    jobSelect.value = config.sourceLabel
  }
}

/** Async wrapper that fetches latest store first */
async function updateJobDropdownFromConfig(config: G2Config): Promise<void> {
  const store = lastStore || await fetchStore(config)
  if (store) {
    updateJobDropdown(store.sources, config)
  }
}

// ── 7. updateConnectionStatus ───────────────────────────────

function updateConnectionStatusDOM(status: ConnectionStatus): void {
  const statusDot = document.getElementById('status-dot')
  const statusText = document.getElementById('status-text')

  if (statusDot) {
    statusDot.className = `status-dot ${status}`
  }
  if (statusText) {
    statusText.textContent = status === 'connected'
      ? T.en.connected
      : status === 'disconnected'
        ? T.en.disconnected
        : T.en.loading
  }

  // Show/hide error message banner
  const errorBanner = document.getElementById('error-banner')
  if (errorBanner) {
    if (status === 'disconnected' && errorState.consecutiveFailures >= 3) {
      errorBanner.style.display = 'block'
    } else {
      errorBanner.style.display = 'none'
    }
  }
}

// ── 8. renderPreview (phone UI message preview) ─────────────

function renderPreview(msgs: HermesMessage[]): void {
  const preview = document.getElementById('message-preview')
  if (!preview) return

  if (msgs.length === 0) {
    preview.innerHTML = `<p class="preview-empty">${T.en.noMessages}</p>`
    return
  }

  const items = msgs.slice(0, 5).map((msg) => {
    const firstLine = msg.body.indexOf('\n') === -1
      ? msg.body
      : msg.body.substring(0, msg.body.indexOf('\n'))
    const sourceTag = msg.source === 'cron' ? 'cron' : msg.source === 'session' ? 'sess' : 'dir'
    const truncated = firstLine.length > 60 ? firstLine.substring(0, 59) + '…' : firstLine
    return `<div class="preview-item"><span class="preview-tag">[${sourceTag}]</span> ${escapeHtml(truncated)}</div>`
  }).join('')

  preview.innerHTML = items
}

/** Populate message preview for phone-only mode */
async function populateMessagePreview(): Promise<void> {
  const store = await fetchStore(currentConfig)
  if (store) {
    lastStore = store
    const msgs = filterMessages(store, currentConfig)
    lastMessages = msgs
    renderPreview(msgs)
    updatePhoneMessageCount(msgs.length, store.messages.length)
  }
}

// ── 9. Error handling ────────────────────────────────────────

function showError(message: string, retryable: boolean): void {
  errorState.message = message
  errorState.retryable = retryable

  const errorBanner = document.getElementById('error-banner')
  const errorMsg = document.getElementById('error-message')
  const retryBtn = document.getElementById('retry-btn')

  if (errorBanner) {
    errorBanner.style.display = 'block'
  }
  if (errorMsg) {
    errorMsg.textContent = message
  }
  if (retryBtn) {
    retryBtn.style.display = retryable ? 'inline-block' : 'none'
  }
}

function clearError(): void {
  errorState.message = ''
  errorState.retryable = false

  const errorBanner = document.getElementById('error-banner')
  if (errorBanner) {
    errorBanner.style.display = 'none'
  }
}

// ── 10. Theme application ────────────────────────────────────

function applyTheme(theme: 'system' | 'dark' | 'light'): void {
  // Toggle #tokens-dark and #tokens-light style blocks via .disabled
  const darkStyles = document.getElementById('tokens-dark')
  const lightStyles = document.getElementById('tokens-light')

  if (theme === 'dark') {
    setStyleDisabled(darkStyles, false)
    setStyleDisabled(lightStyles, true)
  } else if (theme === 'light') {
    setStyleDisabled(darkStyles, true)
    setStyleDisabled(lightStyles, false)
  } else {
    // system — use matchMedia
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    setStyleDisabled(darkStyles, !isDark)
    setStyleDisabled(lightStyles, isDark)
  }

  // Listen for matchMedia changes when theme='system'
  if (stopThemeMediaListener) {
    stopThemeMediaListener()
    stopThemeMediaListener = null
  }

  if (theme === 'system') {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent): void => {
      setStyleDisabled(darkStyles, !e.matches)
      setStyleDisabled(lightStyles, e.matches)
    }
    mq.addEventListener('change', handler)
    stopThemeMediaListener = () => mq.removeEventListener('change', handler)
  }
}

function setStyleDisabled(styleEl: HTMLElement | null, disabled: boolean): void {
  if (!styleEl) return
  if (disabled) {
    styleEl.setAttribute('disabled', '')
  } else {
    styleEl.removeAttribute('disabled')
  }
}

// ── Phone UI mode helpers ────────────────────────────────────

function showG2Mode(): void {
  // Status is shown inline in CONNECTION > Status row — nothing extra needed
}

function showPhoneOnlyMode(): void {
  // Phone UI is always visible; G2 status dot reflects connection state
  updateConnectionStatusDOM('disconnected')
}

// ── G2 input event handlers ─────────────────────────────────

function handleListItemSelected(index: number): void {
  appState.level = 1
  appState.detailIndex = index
  if (bridge) {
    void renderMessageDetail(bridge, index)
  }
}

function handleBackToList(): void {
  appState.level = 0
  appState.detailIndex = 0
  if (bridge && lastMessages.length > 0) {
    void getLastSeen().then((lastSeenTs) => {
      if (bridge) {
        const label = configLabel(currentConfig)
        void renderMessageList(bridge, lastMessages, label, lastSeenTs)
      }
    })
  }
}

// ── Utility helpers ─────────────────────────────────────────

/** Build a human-readable label for the current config filter */
function configLabel(config: G2Config): string {
  if (config.sourceType === 'all') return 'All'
  if (config.sourceLabel) return config.sourceLabel
  return config.sourceType
}

/** Update source select to match config */
function updateSourceSelect(sourceType: G2Config['sourceType']): void {
  const sourceSelect = document.getElementById('source-select') as HTMLSelectElement | null
  if (sourceSelect) {
    sourceSelect.value = sourceType
  }
}

/** Update phone message count badge */
function updatePhoneMessageCount(filtered: number, total: number): void {
  const countEl = document.getElementById('message-count')
  if (countEl) {
    countEl.textContent = `${filtered}/${total} ${T.en.messages}`
  }
}

/** Simple HTML entity escaping for preview */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// ── Auto-start ──────────────────────────────────────────────

// Start the app when the DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => { void main() })
} else {
  void main()
}

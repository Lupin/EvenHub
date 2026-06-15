// ── Dashboard API fetcher ────────────────────────────────────
// Polling, filtering, and error resilience.

import {
  type G2Config,
  type HermesMessage,
  type MessageStore,
  type HealthResponse,
} from './types'

// ── URL helpers ──────────────────────────────────────────────

export function getApiUrl(config: G2Config): string {
  const { ip, port } = config.server
  return `http://${ip}:${port}/api/plugins/hermes-g2/inbox`
}

export function getHealthUrl(config: G2Config): string {
  const { ip, port } = config.server
  return `http://${ip}:${port}/api/plugins/hermes-g2/health`
}

// ── Fetch ────────────────────────────────────────────────────

export async function fetchStore(config: G2Config): Promise<MessageStore | null> {
  try {
    const url = getApiUrl(config)
    const resp = await fetch(url)
    if (!resp.ok) return null
    return await resp.json() as MessageStore
  } catch {
    return null
  }
}

export async function fetchHealth(config: G2Config): Promise<HealthResponse | null> {
  try {
    const url = getHealthUrl(config)
    const resp = await fetch(url)
    if (!resp.ok) return null
    return await resp.json() as HealthResponse
  } catch {
    return null
  }
}

// ── Filtering ────────────────────────────────────────────────

export function filterMessages(
  store: MessageStore,
  config: G2Config,
): HermesMessage[] {
  let list = store.messages
  if (config.sourceType !== 'all') {
    list = list.filter((m) => m.source === config.sourceType)
  }
  if (config.sourceLabel !== '') {
    list = list.filter((m) => m.label === config.sourceLabel)
  }
  if (list.length > config.maxMessages) {
    list = list.slice(0, config.maxMessages)
  }
  return list
}

// ── Polling ──────────────────────────────────────────────────

export function startPolling(
  config: G2Config,
  onUpdate: (messages: HermesMessage[], store: MessageStore) => void,
  onHealth: (health: HealthResponse) => void,
): () => void {
  async function pollInbox(): Promise<void> {
    const store = await fetchStore(config)
    if (store) {
      const msgs = filterMessages(store, config)
      onUpdate(msgs, store)
    }
  }

  async function pollHealth(): Promise<void> {
    const health = await fetchHealth(config)
    if (health) onHealth(health)
  }

  // Immediate first fetch
  void pollInbox()
  void pollHealth()

  const inboxInterval = setInterval(() => { void pollInbox() }, 30_000)
  const healthInterval = setInterval(() => { void pollHealth() }, 60_000)

  return () => {
    clearInterval(inboxInterval)
    clearInterval(healthInterval)
  }
}

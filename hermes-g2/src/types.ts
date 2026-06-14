// ── Data types ──────────────────────────────────────────────

/** A single message from Hermes */
export interface HermesMessage {
  ts: number              // Unix milliseconds
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
  /** Whether the Hermes gateway is running */
  gateway_online: boolean
}

/** Metadata about an available source */
export interface SourceInfo {
  type: 'cron' | 'session' | 'direct'
  label: string          // e.g., 'veille-akiya-japon'
  count: number          // messages from this source
}

/** Health check response from /api/plugins/hermes-g2/health */
export interface HealthResponse {
  status: 'ok' | 'error'
  gateway_online: boolean
  cron_jobs_total: number
  cron_jobs_active: number
  last_cron_run: string | null  // ISO timestamp or null
}

// ── Config types ────────────────────────────────────────────

/** Connection to the Hermes Dashboard */
export interface ServerConfig {
  /** Dashboard IP address (auto-detected from window.location.hostname) */
  ip: string
  /** Dashboard port */
  port: number
}

/** User configuration persisted via bridge.setLocalStorage */
export interface G2Config {
  /** Which source type to filter by, or 'all' */
  sourceType: 'cron' | 'session' | 'direct' | 'all'
  /** Specific source label to filter by, or '' for all of that type */
  sourceLabel: string
  /** Maximum messages to show on G2 (1–20, SDK limit) */
  maxMessages: number
  /** Server connection */
  server: ServerConfig
  /** Theme: 'system' | 'dark' | 'light' */
  theme: 'system' | 'dark' | 'light'
  /** Timestamp (ms) of when the message list was last viewed — for NEW badges */
  lastSeenTs: number
  /** Has the user completed first-launch onboarding? */
  firstLaunch: boolean
}

export const DEFAULT_CONFIG: G2Config = {
  sourceType: 'all',
  sourceLabel: '',
  maxMessages: 20,
  server: {
    ip: '',
    port: 8765,
  },
  theme: 'system',
  lastSeenTs: 0,
  firstLaunch: true,
}

// ── App state types ─────────────────────────────────────────

export type NavLevel = -1 | 0 | 1  // -1=onboarding, 0=list, 1=detail

/** Runtime state — lives in main.ts, not persisted */
export interface AppState {
  level: NavLevel
  detailIndex: number
}

// ── Error state ─────────────────────────────────────────────

export type ConnectionStatus = 'connected' | 'disconnected' | 'checking'

/** Runtime error info for UI display */
export interface ErrorState {
  /** User-visible error message (empty = no error) */
  message: string
  /** Whether to show a Retry button */
  retryable: boolean
  /** Consecutive fetch failures for escalation */
  consecutiveFailures: number
}

// ── i18n (minimal, for companion UI) ────────────────────────

export type Lang = 'en' | 'fr'

export const T: Record<Lang, Record<string, string>> = {
  en: {
    title: 'Hermes G2',
    subtitle: 'Your Agent, on your glasses.',
    connection: 'CONNECTION',
    server: 'Server',
    port: 'Port',
    status: 'Status',
    theme: 'Theme',
    themeSystem: 'System',
    themeDark: 'Dark',
    themeLight: 'Light',
    appearance: 'Appearance',
    source: 'SOURCE',
    job: 'Job',
    allJobs: 'All Jobs',
    allSources: 'All Sources',
    messages: 'messages',
    message: 'message',
    refreshNow: 'Refresh now',
    retry: 'Retry connection',
    loading: 'Loading...',
    noMessages: 'No messages yet.',
    noMessagesSub: 'Messages will appear here when Hermes cron jobs run.',
    noMessagesFilter: 'No messages found.',
    noMessagesFilterSub: 'Try a different source on your phone.',
    connected: 'Connected',
    disconnected: 'Disconnected',
    dashboardOffline: 'Dashboard not reachable. Run hermes dashboard on your Mac.',
    networkError: 'Network error. Check WiFi connection.',
    gatewayOffline: 'Gateway offline — no new messages',
    cachedData: 'Showing cached data',
    parseError: 'Could not load messages. Retrying...',
    parseErrorPersistent: 'Data format error. The dashboard API may need a restart.',
    g2NotDetected: 'G2 not detected — running in phone mode.',
    onboardingTitle: 'Hermes G2',
    onboardingBody: 'Configure on your phone',
    onboardingDetail: 'Open the Hermes G2 companion app and select a source.',
    exit: 'exit',
    backToList: 'back to list',
    scrollHint: 'scroll   tap detail   exit',
  },
  fr: {
    title: 'Hermes G2',
    subtitle: 'Votre Agent, sur vos lunettes.',
    connection: 'CONNEXION',
    server: 'Serveur',
    port: 'Port',
    status: 'Statut',
    theme: 'Thème',
    themeSystem: 'Système',
    themeDark: 'Sombre',
    themeLight: 'Clair',
    appearance: 'Apparence',
    source: 'SOURCE',
    job: 'Job',
    allJobs: 'Tous les jobs',
    allSources: 'Toutes les sources',
    messages: 'messages',
    message: 'message',
    refreshNow: 'Rafraîchir',
    retry: 'Réessayer',
    loading: 'Chargement...',
    noMessages: 'Aucun message.',
    noMessagesSub: 'Les messages apparaîtront ici quand les cron Hermes tourneront.',
    noMessagesFilter: 'Aucun message trouvé.',
    noMessagesFilterSub: 'Essayez une autre source sur le téléphone.',
    connected: 'Connecté',
    disconnected: 'Déconnecté',
    dashboardOffline: 'Dashboard inaccessible. Lancez hermes dashboard sur votre Mac.',
    networkError: 'Erreur réseau. Vérifiez la connexion WiFi.',
    gatewayOffline: 'Gateway hors ligne — pas de nouveaux messages',
    cachedData: 'Données en cache',
    parseError: 'Impossible de charger les messages. Nouvelle tentative...',
    parseErrorPersistent: 'Erreur de format. Le dashboard a peut-être besoin d\'un redémarrage.',
    g2NotDetected: 'G2 non détecté — mode téléphone.',
    onboardingTitle: 'Hermes G2',
    onboardingBody: 'Configurez sur le téléphone',
    onboardingDetail: 'Ouvrez l\'app companion Hermes G2 et choisissez une source.',
    exit: 'quitter',
    backToList: 'retour liste',
    scrollHint: 'défiler   taper détail   quitter',
  },
}

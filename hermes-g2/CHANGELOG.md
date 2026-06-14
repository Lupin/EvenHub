# Changelog

All notable changes to Hermes G2 will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.1.0] — 2026-06-14

### Added

- **Dashboard Plugin API** — `plugin_api.py` with `/inbox` and `/health` endpoints, serving cron outputs, session data, and gateway status from the Hermes Dashboard.
- **Companion WebView** — Phone-based configuration UI with source selection, per-job filtering, message preview, and connection status indicator.
- **G2 Message List** — Interactive list rendering on G2 glasses via Even Hub SDK `ListContainerProperty`, with timestamp, source tag, and message preview per item.
- **G2 Message Detail** — Full message body view on G2 glasses with date, source badge, and back-to-list navigation.
- **NEW Badges** — Messages received since the user's last view get a `●` indicator in the G2 list.
- **Three-Way Theme** — System / Dark / Light theme toggle following Even OS 2.0 design guidelines, with CSS custom property tokens and `matchMedia` for system preference detection.
- **Offline Resilience** — Cached message store persists across network failures; error escalation after 3 consecutive failed polls with retry button.
- **Config Persistence** — Settings stored via Even Hub SDK `bridge.setLocalStorage` with `window.localStorage` fallback; cross-context config sync via `storage` events and 2-second polling fallback.
- **First-Launch Onboarding** — One-time onboarding screen on G2 glasses guiding users to configure sources from their phone.
- **Visibility-Aware Polling** — Inbox and health polling pauses when the WebView tab is hidden, resumes with immediate fetch on visibility change.
- **English + French i18n** — All companion UI strings and G2 display hints in both languages.
- **Even OS 2.0 Compliant** — Typography scale, token-based theming, SettingsGroup layout, SegmentedControl, and custom select dropdowns following Even Realities design guidelines.
- **Zero Telemetry** — No analytics, no tracking, no external data collection.

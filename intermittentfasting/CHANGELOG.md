Changelog - Intermittent Fasting for Even Realities G2

v1.0.16 (2026-06-16)

  Added
  - EAT.png / FAST.png images in text mode: the bottom-right image
    now shows EAT during eating windows and FAST during fasting
    periods. Switches automatically when the phase changes.

v1.0.15 (2026-06-16)

  Fixed
  - Version sync: all 5 version locations now consistently show the
    same build number (footer, inline JS, glasses debug footer,
    app.json, dist/app.json).

v1.0.14 (2026-06-16)

  Fixed
  - Debug footer added to glasses display (bottom line) showing
    version, preset, mode, language, and time format. Helps diagnose
    persistence issues on hardware.
  - Companion bridge handoff: window.__bridge polling from main.ts
    replaces EvenAppBridge.getInstance() for reliable persistent
    storage in the companion app.

v1.0.13 (2026-06-16)

  Fixed
  - Bridge storage: companion now uses window.__bridge (exposed by
    main.ts after SDK handshake) instead of guessing at
    EvenAppBridge.getInstance(). This ensures setLocalStorage/
    getLocalStorage actually persists across app restarts.
  - Text/Timeline toggle now saves config and immediately pushes
    the display change to the glasses — no more waiting for the
    next polling cycle.
  - Save button saves all settings without pushing to glasses
    (normal polling handles the refresh).
  - Debug panel added to companion app showing version, storage
    backend, bridge status, and current saved config. Will be
    removed once persistence is confirmed stable.

v1.0.12 (2026-06-16)

  Fixed
  - Persistent storage: migrated from window.localStorage to bridge
    setLocalStorage/getLocalStorage. Settings now survive app repacks
    and restarts — your fasting schedule, time format, language, and
    theme preferences are preserved permanently.
  - Background keep-alive: the fasting tracker now continues running
    even when the app is in the background (SDK v0.0.10+ keep-alive).
    Progress bar and phase transitions update without reopening.

v1.0.11 (2026-06-16)

  Fixed
  - Fixed settings not saving: your fasting schedule, time format, and
    preferences now persist correctly across app restarts.
  - Fixed schedule resetting to 08:00pm on every launch.
  - Fixed time format toggle: switching between 24h and AM/PM now works.

v1.0.10 (2026-06-12)

  Changed
  - Preset names replaced across all 6 languages. Branded names
    (Leangains, Warrior, Extended) replaced with difficulty-level
    descriptors: Beginner, Classic, Intermediate, Advanced.
  - 5:2: Weekday → 2-Day (and equivalents in all languages).
  - ADF: Alt. Day → Alternate.
  - Consistent naming grid across EN, FR, ES, ZH, JA, KO.

v1.0.9 (2026-06-12)

  Added
  - 4 new languages: Spanish (es), Chinese (zh), Japanese (ja),
    Korean (ko). Total: 6 languages (EN, FR, ES, ZH, JA, KO).
  - Language selector is now a <select> dropdown instead of a binary
    EN/FR toggle. Options rendered in their native names.
  - Full i18n for all 6 languages in companion app, text mode, and
    timeline mode (STATUS labels, TIME_LABEL, preset names/descs).

  Changed
  - Language type expanded from 'en'|'fr' to 6 languages.
  - app.json supported_languages updated to all 6.

v1.0.8 (2026-06-12)

  Changed
  - Mode switching is now companion-app only. Removed swipe gesture for
    mode toggle on the glasses. Switch between Text and Timeline modes
    exclusively from the phone companion app.
  - Double-tap triggers bridge.shutDownPageContainer(1), the system exit
    confirmation dialog. No other action on double-tap.

  Docs
  - store-assets/store-description.md: updated interaction description
  - social Networks/x-twitter.md: Tweet 2/5 updated
  - social Networks/discord.md: tease, launch, known limitations updated

v1.0.7 (2026-06-12)

  Changed
  - Swipe up/down (SCROLL_TOP / SCROLL_BOTTOM) toggles display mode
    (Text to Timeline).
  - Double-tap (DOUBLE_CLICK) triggers bridge.shutDownPageContainer(1),
    the system exit confirmation dialog.
  - Event handler now checks all three event sources: listEvent,
    textEvent, sysEvent.

  Docs
  - store-assets/store-description.md: updated to "Swipe to switch
    modes. Double-tap to exit."
  - social Networks/: x-twitter.md and discord.md updated

v1.0.6 (2026-06-12)

  Fixed
  - Store rejection: added bridge.shutDownPageContainer(1) to double-tap
    handler. Even Hub store requires an exit mechanism in the bundle.
    Double-tap toggles display mode and shows system exit dialog.
    Confirm to quit, cancel to stay with new mode.

v1.0.5 (2026-06-10)

  Added
  - 7 fasting presets: 14:10, 16:8, 18:6, 20:4, OMAD, 5:2, ADF
  - Two display modes: Text (corner countdown) and Timeline (full-width
    Unicode progress bar)
  - Phase transition notifications: glasses alert + phone notification +
    sound
  - 6 languages: EN, FR, ES, ZH, JA, PT
  - 12h/24h time format
  - Dark / Light / System theme
  - Fully offline: localStorage only, no accounts, no tracking

v1.0.4 (2026-06-09)

  Changed
  - Theme selector (dark/light/system) in companion app
  - i18n fix: display modules use config.lang for all user-visible text
  - Version footer in companion app for build verification

v1.0.0 - v1.0.3 (2026-06-08)

  - Initial development, companion app UI, container layout, image push
  - Phone settings UI merged into index.html (no black screen on
    companion)
  - Manifest renamed to app.json, package output standardized

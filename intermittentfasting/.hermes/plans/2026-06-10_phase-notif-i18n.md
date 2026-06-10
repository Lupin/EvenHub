# i18n 6 Langues + Système de Notification

> **Statut :** Plan de référence — à implémenter plus tard.
> **Pour Hermes :** utilise le skill `subagent-driven-development` pour l'implémentation.

**Goal:** (1) Ajouter espagnol, chinois, japonais et portugais (total 6 langues : en, fr, es, zh, ja, pt) dans toute l'app — affichage lunettes + companion UI. (2) Système de notification de changement de phase : message sur les lunettes pendant 5s + notification système + son sur le téléphone.

**Architecture:** Détection de transition par comparaison d'état à chaque rebuild. Notification lunettes via `textContainerUpgrade` qui remplace le contenu normal pendant 5s. Notification téléphone via Web Notification API + Web Audio API dans le companion JS, déclenchée par une clé localStorage bridge écrite par le code lunettes.

**Tech Stack:** TypeScript, Even Hub SDK, vanilla JS companion, Vite

---

## Partie 1 — i18n 6 Langues (es, zh, ja, pt)

### Fichiers à modifier

| Fichier | Changement |
|---------|------------|
| `src/types.ts` | `Language` type : `'en' \| 'fr' \| 'es' \| 'zh' \| 'ja' \| 'pt'` |
| `src/i18n.ts` | Ajouter les 4 nouveaux objets de traduction |
| `src/display/timeline-mode.ts` | Étendre STATUS à 6 langues |
| `src/display/text-mode.ts` | Étendre STATUS + TIME_LABEL à 6 langues |
| `index.html` | Ajouter es/zh/ja/pt dans l'objet `T`, cycling 6 langues, noms des langues |

### Points clés

**Type Language** — `types.ts` :
```typescript
export type Language = 'en' | 'fr' | 'es' | 'zh' | 'ja' | 'pt'
```

**Companion : cycling 6 langues** — remplacer le toggle binaire EN↔FR :
```javascript
var LANG_ORDER = ['en', 'fr', 'es', 'zh', 'ja', 'pt'];
cfg.lang = LANG_ORDER[(LANG_ORDER.indexOf(cfg.lang) + 1) % LANG_ORDER.length];
```

**Companion : noms des langues** dans `render()` :
```javascript
var langNames = { en:'English', fr:'Français', es:'Español', zh:'中文', ja:'日本語', pt:'Português' };
document.getElementById('langValue').textContent = langNames[cfg.lang] || cfg.lang;
```

**Traductions companion** (`T` object dans `index.html`) — chaque langue a ces clés :
`title, type, sched, start, settings, lang, timeFmt, theme, dark, light, system, text, timeline, cancel, save, saved, p14n, p14d, p16n, p16d, p18n, p18d, p20n, p20d, p23n, p23d, p52n, p52d, padfn, padfd`

**Traductions i18n.ts** — chaque langue a ces clés :
`appTitle, fastingType, schedule, fastStart, fastEnd, displayMode, textMode, textModeDesc, timelineMode, timelineModeDesc, custom, customDesc, cancel, save, language, fasting, eating, restDay, timeFormat, h24, h12` + tous les `preset_*_name` et `preset_*_desc`

**Display modules (timeline-mode.ts, text-mode.ts)** — STATUS inline dans chaque module :
```typescript
const STATUS: Record<string, Record<string, string>> = {
  en: { fasting: '...', eating: '...', rest: '...' },
  fr: { ... }, es: { ... }, zh: { ... }, ja: { ... }, pt: { ... },
}
```

### Risque CJK

Les caractères chinois/japonais peuvent ne pas rendre sur l'écran G2 si le firmware n'a pas de fonte CJK. La doc référence (demo-app-g2) montre que les caractères fullwidth alphanumériques sont disponibles, ce qui suggère un support CJK. **À tester sur hardware avant de valider.** Fallback : pinyin/romaji ou fullwidth ASCII si les glyphes natifs ne passent pas.

---

## Partie 2 — Système de Notification de Phase

### Architecture

```
timeline-mode.ts (lunettes)            index.html companion (téléphone)
        │                                        │
detectPhaseChange() détecte                      │
un changement de phase                           │
        │                                        │
        ├─→ textContainerUpgrade                 │
        │   affiche "▶ JEÛNE"                    │
        │   pendant 5s sur lunettes              │
        │                                        │
        └─→ localStorage['even-fasting-notif']   │
            écrit {phase, lang, ts}              │
                 │                               │
                 └──────── localStorage ─────────→│
                                        setInterval 2s poll
                                                 │
                                        détecte nouveau ts
                                                 │
                                        new Notification(...)
                                        + playBeep()
```

### 2a — Détection de phase + affichage lunettes

**Module-level state** dans `timeline-mode.ts` :
```typescript
type Phase = 'fasting' | 'eating' | 'rest'

let lastPhase: Phase | null = null
let notificationUntil: number = 0  // timestamp — afficher la notif jusqu'à cette date

const NOTIFICATION_DURATION = 5000  // 5 secondes

const NOTIFICATION_MSGS: Record<string, Record<Phase, string>> = {
  en: { fasting: '▶ FASTING', eating: '▶ EATING', rest: '▶ REST DAY' },
  fr: { fasting: '▶ JEÛNE',  eating: '▶ REPAS',  rest: '▶ REPOS' },
  es: { fasting: '▶ AYUNO',  eating: '▶ COMIDA', rest: '▶ DESCANSO' },
  zh: { fasting: '▶ 禁食',   eating: '▶ 进食',   rest: '▶ 休息' },
  ja: { fasting: '▶ 断食',   eating: '▶ 食事',   rest: '▶ 休憩' },
  pt: { fasting: '▶ JEJUM',  eating: '▶ REFEIÇÃO', rest: '▶ DESCANSO' },
}
```

**Fonction `detectPhaseChange`** :
```typescript
export function detectPhaseChange(currentPhase: Phase, lang: string): string | null {
  const now = Date.now()

  // Encore dans la fenêtre de notification → continuer à l'afficher
  if (notificationUntil > now) {
    return NOTIFICATION_MSGS[lang]?.[currentPhase] || NOTIFICATION_MSGS.en[currentPhase]
  }

  // Premier appel → initialiser, pas de notification
  if (lastPhase === null) {
    lastPhase = currentPhase
    return null
  }

  // Changement de phase → déclencher notification
  if (lastPhase !== currentPhase) {
    lastPhase = currentPhase
    notificationUntil = now + NOTIFICATION_DURATION

    // Bridge vers le téléphone : écrire l'événement dans localStorage
    try {
      localStorage.setItem('even-fasting-notif', JSON.stringify({
        phase: currentPhase, lang, ts: now,
      }))
    } catch {}

    return NOTIFICATION_MSGS[lang]?.[currentPhase] || NOTIFICATION_MSGS.en[currentPhase]
  }

  lastPhase = currentPhase
  return null
}
```

**Intégration dans `buildTimelinePage`** — après avoir déterminé l'état fasting/rest :
```typescript
const currentPhase: Phase = preset?.fullDay && !fasting ? 'rest'
  : fasting ? 'fasting' : 'eating'
const notifMsg = detectPhaseChange(currentPhase, config.lang)

// Si notifMsg est set, remplacer la ligne normale par le message de notif
return buildResult(notifMsg || line, clockStr, fasting)
```

**Rebuild périodique** — changer de 30s à 15s dans `main.ts` pour que la notification expire au max 15s après :
```typescript
setInterval(async () => {
  await rebuildCurrentMode(bridge)
}, 15000)  // était 30000
```

### 2b — Notification téléphone + son

**Code à ajouter dans `index.html`**, après le `render()` de l'IIFE :

```javascript
// ── Phase transition: phone notification + sound ────────────
(function(){
  var NOTIF_KEY = 'even-fasting-notif';
  var lastTs = 0;

  var NOTIF_TITLES = {
    en: { fasting:'Fasting started', eating:'Eating window', rest:'Rest day' },
    fr: { fasting:'Jeûne commencé', eating:'Fenêtre repas', rest:'Jour de repos' },
    es: { fasting:'Ayuno iniciado', eating:'Ventana comida', rest:'Día descanso' },
    zh: { fasting:'开始断食', eating:'进食窗口', rest:'休息日' },
    ja: { fasting:'断食開始', eating:'食事時間', rest:'休憩日' },
    pt: { fasting:'Jejum iniciado', eating:'Janela refeição', rest:'Dia descanso' },
  };

  var NOTIF_BODIES = {
    en: { fasting:'Your fasting window is now active.', eating:'Time to eat.', rest:'No fasting today.' },
    fr: { fasting:'Votre fenêtre de jeûne est active.', eating:'Vous pouvez manger.', rest:'Pas de jeûne aujourd\'hui.' },
    es: { fasting:'Tu ventana de ayuno está activa.', eating:'Puedes comer.', rest:'Sin ayuno hoy.' },
    zh: { fasting:'断食窗口已开启。', eating:'可以进食了。', rest:'今天不强制断食。' },
    ja: { fasting:'断食時間が始まりました。', eating:'食事ができます。', rest:'本日は断食なし。' },
    pt: { fasting:'Sua janela de jejum está ativa.', eating:'Hora de comer.', rest:'Sem jejum hoje.' },
  };

  function playBeep() {
    try {
      var ctx = new (window.AudioContext || window.webkitAudioContext)();
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'sine'; osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.3);
    } catch(e) {}
  }

  document.addEventListener('click', function requestPerm() {
    if (Notification && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, { once: false });

  function showPhoneNotification(phase, lang) {
    if (!Notification || Notification.permission !== 'granted') return;
    var t = NOTIF_TITLES[lang] || NOTIF_TITLES.en;
    var b = NOTIF_BODIES[lang] || NOTIF_BODIES.en;
    try {
      new Notification('Intermittent Fasting', {
        body: (t[phase] || phase) + ' — ' + (b[phase] || ''),
        silent: false,
      });
    } catch(e) {}
  }

  setInterval(function(){
    try {
      var raw = localStorage.getItem(NOTIF_KEY);
      if (!raw) return;
      var data = JSON.parse(raw);
      if (data.ts && data.ts !== lastTs) {
        lastTs = data.ts;
        showPhoneNotification(data.phase, data.lang);
        playBeep();
      }
    } catch(e) {}
  }, 2000);
})();
```

### 2c — Périmètre et limites

- **Notifications lunettes :** timeline-mode uniquement. Le mode texte garde son comportement actuel.
- **Permission notification téléphone :** demandée au premier clic utilisateur dans le companion. Sur iOS, le WebView hérite des permissions de l'app hôte — si refusé, la notif système ne part pas, mais le beep fonctionne quand même.
- **AudioContext autoplay :** le navigateur bloque l'AudioContext avant interaction utilisateur. Le `try/catch` protège, et comme l'utilisateur a déjà interagi avec le companion, le beep devrait passer.
- **Flicker rebuild :** `rebuildPageContainer` cause un flash visible. Les transitions de phase sont rares (~2/jour), donc acceptable.
- **G2 n'a pas d'API notification native :** pas de vibration, pas de son sur les lunettes. Le message visuel pendant 5s est le seul canal disponible sur le device.

---

## Résumé des fichiers touchés

| Fichier | i18n | Notif |
|---------|------|-------|
| `src/types.ts` | ✓ Language type | — |
| `src/i18n.ts` | ✓ 4 nouvelles langues | — |
| `src/display/timeline-mode.ts` | ✓ STATUS 6 langues | ✓ detectPhaseChange + localStorage bridge |
| `src/display/text-mode.ts` | ✓ STATUS + TIME_LABEL 6 langues | — |
| `src/main.ts` | — | ✓ rebuild 30s → 15s |
| `index.html` | ✓ T object + cycling 6 langues | ✓ phone notif poller + beep |

## Vérification

1. `npx tsc --noEmit` — zéro erreur
2. `npx vite build` — build clean
3. `evenhub pack` → `intermittentfasting.ehpk`
4. Tester sur lunettes : changer de langue → vérifier les labels sur les deux modes
5. Tester sur lunettes : attendre une transition de phase → `▶ JEÛNE` apparaît ~5-15s
6. Tester companion : cycler les 6 langues → tout le texte se met à jour
7. Tester téléphone : transition de phase → notification système + beep
8. Tester téléphone : permission notification demandée au premier tap

## Risques

- **Fonte CJK sur G2 :** si les glyphes chinois/japonais ne rendent pas → fallback pinyin/romaji ou fullwidth ASCII
- **Web Notification sur iOS WebView :** peut ne pas marcher → le beep audio fonctionne indépendamment
- **AudioContext avant interaction :** premier beep possiblement silencieux → protégé par try/catch
- **localStorage en .ehpk :** le packaging vide le localStorage → utiliser `bridge.setLocalStorage()` au lieu de `window.localStorage` si le pattern s'avère fragile. Pour l'instant, le polling 2s + clé dédiée suffit.

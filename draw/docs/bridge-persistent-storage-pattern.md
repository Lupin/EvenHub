# Bridge Persistent Storage — Proven Pattern (DRAW v1.1.5)

Pattern qui marche pour persister des données dans une app Even Hub G2.
Testé sur iPhone avec DRAW — les dessins survivent au kill de l'app Even.

## Pourquoi l'ancien pattern (monkey-patch localStorage) ne marchait pas

1. `index.html` s'exécute AVANT `main.ts` → le monkey-patch n'est pas en place quand Vasarely est seedé
2. `bridge.setLocalStorage(...).catch(() => {})` avalait les erreurs silencieusement
3. Le setLocalStorage était fire-and-forget (pas d'await) — perdu si l'app est killée avant complétion
4. La restauration `getLocalStorage` était conditionnée à `localStorage` vide → jamais déclenchée après seed

## Pattern qui marche

### main.ts — Exposer window.bridgeStorage

```typescript
let _storageCache: any = null
let _storageLoaded = false
let _flushTimer: any = null

function flushToBridge(): void {
  clearTimeout(_flushTimer)
  _flushTimer = null
  if (_storageCache != null && bridge) {
    bridge.setLocalStorage('key', JSON.stringify(_storageCache))
      .catch((e: any) => console.error('[App] bridge.setLocalStorage failed', e))
  }
}

;(window as any).bridgeStorage = {
  async load() {
    if (_storageLoaded) return _storageCache || []
    // Try bridge first
    try {
      const raw = await bridge.getLocalStorage('key')
      if (raw && raw !== '[]') {
        _storageCache = JSON.parse(raw)
        _storageLoaded = true
        return _storageCache || []
      }
    } catch(e) { console.error('[App] bridge.getLocalStorage failed', e) }
    // Fallback localStorage
    try {
      const local = localStorage.getItem('key')
      if (local && local !== '[]') {
        _storageCache = JSON.parse(local)
        _storageLoaded = true
        return _storageCache || []
      }
    } catch(e) {}
    _storageCache = []
    _storageLoaded = true
    return []
  },
  get cached() { return _storageCache || [] },
  save(data: any) {
    _storageCache = data
    _storageLoaded = true
    try { localStorage.setItem('key', JSON.stringify(data)) } catch(e) {}
    clearTimeout(_flushTimer)
    _flushTimer = setTimeout(flushToBridge, 500)
  },
  flush() { flushToBridge() }
}
```

### index.html — Bridge-aware save/load

```javascript
function loadDrawings() {
  if (window.bridgeStorage && window.bridgeStorage.cached) {
    return window.bridgeStorage.cached.slice()
  }
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [] } catch(e) { return [] }
}

function saveDrawings(list) {
  if (window.bridgeStorage) {
    window.bridgeStorage.save(list)
  } else {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  }
}

// Flush on app kill
window.addEventListener('beforeunload', function() {
  if (window.bridgeStorage) window.bridgeStorage.flush()
})

// Poll for bridge readiness (index.html runs BEFORE main.ts)
(function() {
  var poll = 0
  var iv = setInterval(function() {
    poll++
    if (window.bridgeStorage) {
      clearInterval(iv)
      window.bridgeStorage.load().then(function(data) {
        if (data && data.length > 0) {
          saveDrawings(data)
          renderGallery()
        }
      })
    } else if (poll >= 50) {
      clearInterval(iv)
      console.error('[DRAW] bridgeStorage not available after 5s')
    }
  }, 100)
})()
```

## Règles d'or

| Règle | Pourquoi |
|-------|----------|
| Toujours `console.error` dans le `.catch()` | Sinon les échecs sont invisibles |
| Debounce 500ms avant `setLocalStorage` | Évite de flooder le bridge natif |
| `beforeunload` → flush | Dernière sauvegarde avant kill |
| Poller `window.bridgeStorage` (100ms × 5s) | `index.html` inline s'exécute avant `main.ts` |
| Cache mémoire + localStorage en fallback | Lectures synchrones, pas d'I/O |
| `getLocalStorage` toujours exécuté au start | Même si localStorage n'est pas vide |

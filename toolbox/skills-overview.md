# Skills Even Realities — Catalogue

Tous les skills Hermes liés au développement Even Realities G2. Chaque skill est un module de connaissance chargé automatiquement par l'agent quand le contexte correspond.

---

## `even-hub-dev` (v1.14.0)

**Skill complet de développement Even Hub.** La référence principale. Couvre :

- **Système de containers** : Canvas 576×288, 4-bit greyscale, max 4 images + 8 textes par page
- **APIs** : `createStartUpPageContainer` vs `rebuildPageContainer` vs `textContainerUpgrade` — quand utiliser laquelle
- **Événements** : seuls les `DOUBLE_CLICK_EVENT` sont fiables (CLICK/SCROLL consommés par le SDK)
- **Pattern companion app** : WebView téléphone, localStorage bridge, thème light/dark/system
- **Design tokens** : tokens CSS officiels (`even-toolkit`), typographie FK Grotesk Neue, radius 6px
- **Packaging** : `vite build` → `evenhub pack` → QR sideload → test hardware
- **29 pitfalls documentés** : image push via canvas, blink dans conteneurs séparés, blocage WebView cache, thème Vite vs `disabled`, i18n dans les modules display...

**Fichiers de référence liés :**
- `references/design-tokens.md` — table complète des tokens
- `references/g2-glyphs.md` — inventaire des glyphs Unicode qui marchent/pas sur G2
- `references/even-demo-patterns.md` — patterns HTML/CSS extraits de even-demo.vercel.app
- `references/image-debug-pattern.md` — debug des images qui ne rendent pas
- `references/store-assets.md` — génération de mockups et assets store
- `references/design-compliance.md` — audit de conformité design system
- `references/communication-tone.md` — guide de ton pour la communication publique

**Trigger** : build, modif, debug de plugin Even Hub, packaging, sideloading, design companion app.

---

## `g2-image-converter` (v1.1.0)

**Conversion d'images pour l'écran G2.** Traite le pipeline complet :

- **Contraintes G2** : image containers 20–288w × 20–144h, max 4 par page
- **Pipeline sips** (macOS built-in) : rapide, sans dépendance, mais pas de dithering 4-bit
- **Pipeline Python/Pillow** : resize, greyscale, Floyd-Steinberg dither 4-bit (16 niveaux)
- **Intégration SDK** : pattern complet `fetch → canvas re-encode → updateImageRawData`
- **10 pitfalls** : canvas re-encode obligatoire, updates série, event layer texte, BLE lent...

**Trigger** : conversion d'image pour G2, erreur `imageToGray4Failed`, préparation d'assets.

**Script lié** : `scripts/g2-convert.py` (aussi dispo en exécutable autonome dans `toolbox/scripts/g2-convert`)

---

## `even-hub-app-development` (v1.0.0)

**Soumission d'apps sur le store Even Hub.** Couvre le processus de publication :

- Structure du projet plugin Even Hub
- Manifest `app.json`, permissions
- Build system, CI/CD
- Soumission via Even Hub Developer Portal

**Trigger** : préparation d'une app pour le store, soumission, mise à jour de version.

---

## Tableau récapitulatif

| Skill | Version | Scripts | Fichiers de réf |
|-------|---------|---------|-----------------|
| `even-hub-dev` | 1.14.0 | — | 9 références |
| `g2-image-converter` | 1.1.0 | `g2-convert.py` | — |
| `even-hub-app-development` | 1.0.0 | — | — |

---

## Comment utiliser un skill

Dans une conversation avec Hermes, le skill se charge automatiquement quand le contexte correspond (ex: tu parles de packaging Even Hub → `even-hub-dev` est chargé).

Pour le charger manuellement :
```
skill_view("even-hub-dev")
```

Pour voir un fichier de référence lié :
```
skill_view("even-hub-dev", file_path="references/g2-glyphs.md")
```

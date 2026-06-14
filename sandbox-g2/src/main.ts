/**
 * G2 Sandbox — Apprentissage manuel du SDK Even Hub
 *
 * Ce fichier est une version corrigée et commentée du code fourni.
 * Il montre les APIs réelles du SDK et les pièges à éviter.
 *
 * CONCEPTS COUVERTS :
 *  - Création de page (createStartUpPageContainer)
 *  - Mise à jour de contenu (textContainerUpgrade)
 *  - Gestion des événements (onEvenHubEvent)
 *  - Piège CLICK_EVENT = 0 (falsy en JS !)
 *  - Navigation par scroll (SCROLL_TOP / SCROLL_BOTTOM)
 *  - Sortie de l'app (shutDownPageContainer)
 *
 * SDK version : 0.0.10
 */

import {
  waitForEvenAppBridge,
  CreateStartUpPageContainer,
  TextContainerProperty,
  TextContainerUpgrade,
  OsEventTypeList,
} from '@evenrealities/even_hub_sdk'

// ── Données de test ──────────────────────────────────────────

const items = ['Pomme', 'Banane', 'Cerise', 'Datte', 'Fraise']
let currentIndex = 0

// ── Fonctions d'affichage ────────────────────────────────────

/**
 * Construit le texte affiché sur les lunettes.
 * Le caractère » indique l'élément sélectionné.
 */
function render(): string {
  return items
    .map((item, i) => (i === currentIndex ? `» ${item}` : `  ${item}`))
    .join('\n')
}

/**
 * Met à jour le conteneur texte sur les lunettes.
 * Utilise textContainerUpgrade : flicker-free, plus rapide que rebuildPageContainer.
 * Ne change QUE le contenu, pas la position ni la taille (fixées au create).
 */
async function refresh(bridge: Awaited<ReturnType<typeof waitForEvenAppBridge>>) {
  await bridge.textContainerUpgrade(
    new TextContainerUpgrade({
      containerID: 1,
      containerName: 'menu',
      content: render(),
    })
  )
}

/**
 * Valide la sélection : affiche "Validé: X" puis revient au menu après 1.5s.
 */
async function validate(bridge: Awaited<ReturnType<typeof waitForEvenAppBridge>>) {
  const selected = items[currentIndex]
  await bridge.textContainerUpgrade(
    new TextContainerUpgrade({
      containerID: 1,
      containerName: 'menu',
      content: `✓ Validé : ${selected}`,
    })
  )
  console.log('[sandbox] Validé:', selected)

  // Optionnel : revenir au menu après 1.5 secondes
  setTimeout(() => refresh(bridge), 1500)
}

// ── Point d'entrée ───────────────────────────────────────────

async function main() {
  // 1. Attendre que le bridge Even Hub soit disponible
  const bridge = await waitForEvenAppBridge()
  console.log('[sandbox] Bridge connecté')

  // 2. Cacher le statut "initialisation" et montrer le contenu
  const statusEl = document.getElementById('g2-status')
  if (statusEl) statusEl.style.display = 'none'

  // 3. Créer la page de démarrage — UNE SEULE FOIS
  const container = new TextContainerProperty({
    xPosition: 0,
    yPosition: 0,
    width: 576,
    height: 288,
    borderWidth: 0,
    borderColor: 5,
    paddingLength: 4,
    containerID: 1,
    containerName: 'menu',
    isEventCapture: 1,      // ← ce conteneur capture les événements
    content: render(),
  })

  const result = await bridge.createStartUpPageContainer(
    new CreateStartUpPageContainer({
      containerTotalNum: 1,
      textObject: [container],
    })
  )
  console.log('[sandbox] createStartUpPageContainer:', result)
  // result === 0 → succès, result === 1 → ambigu mais souvent OK, >1 → échec

  // 4. Boucle d'événements
  bridge.onEvenHubEvent((event) => {
    // ⚠️  PIÈGE CRITIQUE : CLICK_EVENT = 0, qui est FALSY en JavaScript !
    //     JAMAIS faire `if (!evt.eventType) return` — ça droppe tous les taps.
    //     Toujours comparer avec `!== undefined`.

    const evt = event.textEvent   // on n'utilise que textEvent ici (pas de list)
    if (!evt) return

    // Détection robuste du type d'événement
    let type: OsEventTypeList | undefined

    if (evt.eventType !== undefined) {
      // Chemin normal : le SDK a peuplé eventType
      type = typeof evt.eventType === 'number'
        ? evt.eventType
        : OsEventTypeList.fromJson(evt.eventType)
    }
    // Note : le cas `event.listEvent` avec eventType undefined
    // n'est pas géré ici car on n'utilise pas de conteneur liste.
    // Voir le projet Bad Parrot pour ce pattern.

    switch (type) {
      case OsEventTypeList.SCROLL_TOP_EVENT:
        // Swipe vers le haut → élément précédent
        currentIndex = (currentIndex - 1 + items.length) % items.length
        refresh(bridge)
        break

      case OsEventTypeList.SCROLL_BOTTOM_EVENT:
        // Swipe vers le bas → élément suivant
        currentIndex = (currentIndex + 1) % items.length
        refresh(bridge)
        break

      case OsEventTypeList.CLICK_EVENT:
        // Tap simple → valider la sélection
        validate(bridge)
        break

      case OsEventTypeList.DOUBLE_CLICK_EVENT:
        // Double-tap → quitter l'app (REQUIS pour le store !)
        bridge.shutDownPageContainer(1)  // 1 = dialogue système "Quitter ?"
        break

      default:
        // Événement inconnu — ignorer
        break
    }
  })
}

// ── Démarrage ────────────────────────────────────────────────

main().catch((err) => {
  console.error('[sandbox] Erreur:', err)
  // Si le bridge n'est pas disponible (pas sur les lunettes),
  // on affiche l'UI companion
  const phoneUi = document.getElementById('phone-ui')
  const statusEl = document.getElementById('g2-status')
  if (phoneUi) phoneUi.style.display = 'block'
  if (statusEl) statusEl.style.display = 'none'
})

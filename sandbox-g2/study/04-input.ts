/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  BAD PARROT — ÉTUDE DE CODE                                ║
 * ║  Fichier 4/6 : input.ts — La gestion des entrées (gestes)  ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * CE FICHIER SERT À QUOI ?
 * ─────────────────────────
 * Il traduit les gestes physiques sur les lunettes en actions
 * dans l'app. C'est LE fichier le plus critique de tout projet G2.
 *
 * LES 4 GESTES DISPONIBLES SUR G2 :
 *   - Tap simple         (CLICK_EVENT = 0)
 *   - Swipe vers le haut (SCROLL_TOP_EVENT = 1)
 *   - Swipe vers le bas  (SCROLL_BOTTOM_EVENT = 2)
 *   - Double-tap         (DOUBLE_CLICK_EVENT = 3)
 *
 * ⚠️  LE PIÈGE DU SIÈCLE : CLICK_EVENT = 0
 * ──────────────────────────────────────────
 * En JavaScript, 0 est "falsy" (considéré comme faux).
 *   if (0)     → ne s'exécute pas
 *   if (!0)    → s'exécute (car !false = true)
 *
 * Donc si tu écris :
 *   if (!event.eventType) return  ← BUG : ignore TOUS les taps simples !
 *
 * Le fix : comparer avec undefined explicitement
 *   if (event.eventType !== undefined) ...
 *
 * Ce bug a mordu TOUS les développeurs G2. Maintenant tu le sauras.
 */

// ═══════════════════════════════════════════════════════════════
// 1. IMPORTS
// ═══════════════════════════════════════════════════════════════

import type { EvenAppBridge } from '@evenrealities/even_hub_sdk'
import { OsEventTypeList } from '@evenrealities/even_hub_sdk'
import type { NavigationLevel } from './types'

// ═══════════════════════════════════════════════════════════════
// 2. LA FONCTION setupInputHandlers
// ═══════════════════════════════════════════════════════════════

/**
 * Configure les gestionnaires d'événements (gestes) sur les lunettes.
 *
 * CETTE FONCTION PREND 7 PARAMÈTRES — ÇA FAIT BEAUCOUP, POURQUOI ?
 * ───────────────────────────────────────────────────────────────
 * Plutôt que de "câbler" input.ts directement à display/index.ts,
 * on utilise des CALLBACKS : des fonctions qu'on passe en paramètre.
 *
 * Un callback, c'est une fonction qu'on donne à une autre fonction
 * pour qu'elle l'appelle plus tard. Exemple :
 *
 *   function disBonjour() { console.log('Bonjour !') }
 *   setTimeout(disBonjour, 1000)  // appelle disBonjour dans 1 seconde
 *
 * Ici, input.ts ne sait PAS ce que fait "onNext" ou "onBack".
 * Il sait juste QUELLE callback appeler selon le geste et le niveau.
 * C'est main.ts qui fournit les "vraies" fonctions.
 *
 * AVANTAGE : on peut changer le comportement sans toucher à input.ts.
 *
 * @param bridge            Le pont de com
 * @param getLevel          Fonction qui retourne le niveau actuel (0,1,2)
 * @param onSelectCategory  Callback : l'utilisateur a tapé une catégorie
 * @param onSelectPhrase    Callback : l'utilisateur a tapé une phrase
 * @param onNext            Callback : passer à l'élément suivant
 * @param onPrev            Callback : passer à l'élément précédent
 * @param onBack            Callback : revenir en arrière
 * @returns                 Une fonction pour se désabonner des événements
 */
export function setupInputHandlers(
  bridge: EvenAppBridge,
  getLevel: () => NavigationLevel,
  onSelectCategory: (index: number) => void,
  onSelectPhrase: (index: number) => void,
  onNext: () => void,
  onPrev: () => void,
  onBack: () => void
): () => void {

  // bridge.onEvenHubEvent() enregistre un "écouteur" (listener).
  // À CHAQUE geste sur les lunettes, la fonction fléchée est appelée.
  // La valeur de retour est une fonction pour se désabonner.
  return bridge.onEvenHubEvent((event) => {

    // ── Étape 1 : Récupérer le niveau actuel ──
    const lev = getLevel()

    // ── Étape 2 : Extraire l'événement ──
    // Le SDK peut envoyer l'événement dans 3 propriétés différentes
    // selon le type de conteneur :
    //   - event.listEvent  → événement sur un ListContainer
    //   - event.textEvent  → événement sur un TextContainer
    //   - event.sysEvent   → événement système
    //
    // L'opérateur || (OU logique) prend la première valeur "truthy".
    //   const evt = a || b || c
    //   → si a existe, on prend a ; sinon si b existe, on prend b ; etc.
    const evt = event.listEvent || event.textEvent || event.sysEvent

    // Si aucun événement n'est trouvé, on sort.
    // ⚠️ On vérifie que l'objet evt existe, PAS son eventType !
    //    (car eventType peut valoir 0, qui est falsy)
    if (!evt) return

    // ── Étape 3 : Déterminer le type d'événement ──
    // On commence par undefined = "pas encore déterminé"
    let type: OsEventTypeList | undefined

    // CAS A : eventType est bien défini (cas normal)
    if (evt.eventType !== undefined) {
      // typeof xxx === 'number' → vérifie si c'est un nombre
      // Si oui, on l'utilise directement
      // Si non, on le convertit avec fromJson() (méthode du SDK)
      type = typeof evt.eventType === 'number'
        ? evt.eventType
        : OsEventTypeList.fromJson(evt.eventType)

    // CAS B : eventType est undefined MAIS on a un listEvent
    // → Bug connu du simulateur desktop. On traite comme un tap.
    } else if (event.listEvent) {
      type = OsEventTypeList.CLICK_EVENT
    }

    // ── Étape 4 : Agir selon le type d'événement ET le niveau ──

    // DOUBLE-TAP → selon le niveau
    //   Niveau 0 (catégories)  → quitter l'app (shutDownPageContainer)
    //   Niveaux 1, 2, 3        → revenir en arrière (onBack)
    if (type === OsEventTypeList.DOUBLE_CLICK_EVENT) {
      if (lev === 0) {
        // shutDownPageContainer(1) = affiche le dialogue "Quitter ?"
        // Le 1 est OBLIGATOIRE pour le store Even Hub.
        bridge.shutDownPageContainer(1)
      } else {
        onBack()   // retour au niveau précédent
      }
      return      // important : on sort pour ne pas traiter d'autres actions
    }

    // TAP SUR UNE LISTE (niveaux 0 et 1)
    // Les listes envoient un listEvent avec currentSelectItemIndex
    // (= l'index de l'item sur lequel l'utilisateur a tapé)
    if (event.listEvent && lev <= 1) {
      let idx = event.listEvent.currentSelectItemIndex

      // ⚠️ PIÈGE : l'index 0 peut arriver comme undefined !
      // Pourquoi ? Le SDK n'envoie currentSelectItemIndex QUE quand
      // la sélection CHANGE. Or l'item 0 est sélectionné par défaut
      // → si on tape dessus, la sélection ne change pas → undefined.
      // Donc si idx est undefined ou null, on le force à 0.
      if (idx === undefined || idx === null) idx = 0

      // Selon le niveau, on appelle la bonne callback
      // "lev === 0 ? onSelectCategory : onSelectPhrase" = opérateur ternaire
      // Si lev === 0 → onSelectCategory(idx)
      // Sinon        → onSelectPhrase(idx)
      if (lev === 0) onSelectCategory(idx)
      else onSelectPhrase(idx)
      return
    }

    // SWIPE ↑↓ AU NIVEAU 2 (détail d'une phrase)
    // Au niveau 2, swipe haut = précédent, swipe bas = suivant
    if (lev === 2) {
      if (type === OsEventTypeList.SCROLL_TOP_EVENT) onPrev()
      else if (type === OsEventTypeList.SCROLL_BOTTOM_EVENT) onNext()
      return
    }

    // Si on arrive ici, l'événement n'a été traité par aucun cas.
    // C'est normal pour les événements qu'on ne gère pas.
  })
}

// ═══════════════════════════════════════════════════════════════
// TABLEAU RÉCAPITULATIF DES GESTES
// ═══════════════════════════════════════════════════════════════
//
// Niveau 0 (catégories) :
//   Tap sur un item de liste → onSelectCategory(idx)
//   Double-tap               → quitter l'app
//
// Niveau 1 (phrases) :
//   Tap sur un item de liste → onSelectPhrase(idx)
//   Double-tap               → onBack() (retour aux catégories)
//
// Niveau 2 (détail) :
//   Swipe ↑                  → onPrev()  (phrase précédente)
//   Swipe ↓                  → onNext()  (phrase suivante)
//   Double-tap               → onBack()  (retour à la liste)
//
// ═══════════════════════════════════════════════════════════════
// RÉSUMÉ DE CE FICHIER
// ═══════════════════════════════════════════════════════════════
//
// input.ts :
//   - Exporte UNE SEULE fonction : setupInputHandlers()
//   - Reçoit des callbacks pour chaque action possible
//   - Détecte le type d'événement (tap, swipe, double-tap)
//   - Délègue aux bonnes callbacks selon le niveau
//   - Gère tous les pièges du SDK (CLICK_EVENT=0, index undefined)
//
// LES 3 RÈGLES D'OR DE LA GESTION D'ÉVÉNEMENTS G2 :
//   1. JAMAIS `if (!eventType)` → toujours `if (eventType !== undefined)`
//   2. Toujours traiter `undefined` comme l'index 0 pour les listes
//   3. AU MOINS un conteneur par page doit avoir isEventCapture: 1

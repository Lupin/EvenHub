/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  BAD PARROT — ÉTUDE DE CODE                                ║
 * ║  Fichier 5/6 : main.ts — Le chef d'orchestre               ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * CE FICHIER SERT À QUOI ?
 * ─────────────────────────
 * C'est le "cerveau" de l'app. Il :
 *   1. Initialise le bridge (connexion aux lunettes)
 *   2. Gère la navigation (quel niveau, quelle catégorie, quelle phrase)
 *   3. Connecte les entrées (input.ts) à l'affichage (display/index.ts)
 *
 * C'est le SEUL fichier qui sait "où on en est" dans l'app.
 * Les autres fichiers sont des outils spécialisés qui ne gardent
 * pas d'état.
 */

// ═══════════════════════════════════════════════════════════════
// 1. IMPORTS
// ═══════════════════════════════════════════════════════════════

// waitForEvenAppBridge : la 1re chose à appeler. Attend que le
// bridge soit prêt (le téléphone est connecté aux lunettes).
import { waitForEvenAppBridge } from '@evenrealities/even_hub_sdk'

// Les fonctions d'affichage (fichier 3/6)
import { renderCategoryList, renderPhraseList, renderDetail } from './display'

// La configuration des entrées (fichier 4/6)
import { setupInputHandlers } from './input'

// Les données (fichier 2/6)
import { categories } from './data'

// Le type NavigationLevel (fichier 1/6)
import type { NavigationLevel } from './types'

// ═══════════════════════════════════════════════════════════════
// 2. INDEX GLOBAL — Pour le mode "All categories"
// ═══════════════════════════════════════════════════════════════

/**
 * LE PROBLÈME DU MODE "ALL CATEGORIES"
 * ─────────────────────────────────────
 * Normalement, la navigation est :
 *   catégorie X → phrase Y dans cette catégorie
 *
 * Mais "All categories" mélange TOUTES les phrases de TOUTES
 * les catégories. On ne peut plus naviguer avec (catIndex, phraseIndex).
 * Il faut un INDEX GLOBAL qui pointe vers (catIndex, phraseIndex).
 *
 * LA SOLUTION : un tableau plat (flat array)
 * ───────────────────────────────────────────
 * On parcourt TOUTES les catégories et TOUTES leurs phrases,
 * et on crée un tableau de paires {catIdx, phrIdx}.
 *
 * Exemple avec 2 catégories :
 *   Cat 0 : ["A", "B"]
 *   Cat 1 : ["C", "D", "E"]
 *
 * → ALL_PHRASES = [
 *     {catIdx: 0, phrIdx: 0},  // "A"
 *     {catIdx: 0, phrIdx: 1},  // "B"
 *     {catIdx: 1, phrIdx: 0},  // "C"
 *     {catIdx: 1, phrIdx: 1},  // "D"
 *     {catIdx: 1, phrIdx: 2},  // "E"
 *   ]
 *
 * Pour naviguer : on incrémente/décrémente kanjiIndex,
 * puis on lit ALL_PHRASES[kanjiIndex] pour savoir quelle phrase afficher.
 */

// On crée un tableau vide qu'on va remplir
const ALL_PHRASES: Array<{catIdx: number; phrIdx: number}> = []

// Boucle FOR classique : pour chaque catégorie...
for (let ci = 0; ci < categories.length; ci++) {
  // ...pour chaque phrase dans cette catégorie...
  for (let pi = 0; pi < categories[ci].phrases.length; pi++) {
    // ...on ajoute la paire au tableau
    ALL_PHRASES.push({catIdx: ci, phrIdx: pi})
  }
}

// "All categories" est un item VIRTUEL — il n'existe pas dans data.ts.
// On l'ajoute à la fin de la liste des catégories dans display/index.ts.
// Cette constante représente son index : après les 7 vraies catégories.
//   categories[0] = Street      (index 0)
//   categories[1] = Casual      (index 1)
//   ...
//   categories[6] = WTF         (index 6)
//   "All categories"            (index 7 = ALL_CAT_INDEX)
const ALL_CAT_INDEX = categories.length  // = 7

// ═══════════════════════════════════════════════════════════════
// 3. LA FONCTION PRINCIPALE — main()
// ═══════════════════════════════════════════════════════════════

/**
 * Point d'entrée de l'application.
 *
 * "async function" = cette fonction peut utiliser "await".
 * "Promise<void>" = elle retourne une promesse qui ne produit pas de valeur.
 *
 * ASYNC/AWAIT POUR LES NULS :
 * ──────────────────────────
 * Imagine que tu commandes un café :
 *   - Sans async/await : tu passes commande, tu attends debout,
 *     tu ne peux rien faire d'autre. (code bloquant)
 *   - Avec async/await : tu passes commande, tu t'assieds, tu lis
 *     un magazine, et quand le café est prêt le serveur t'appelle.
 *     (code non-bloquant)
 *
 * "await" = "attends que ce soit fini, mais laisse les autres
 *            choses tourner en attendant".
 */
async function main(): Promise<void> {

  // ── ÉTAT DE L'APPLICATION ──────────────────────────────
  // Ces variables représentent "où on en est" dans l'app.
  // Elles changent au fil des interactions utilisateur.

  let level: NavigationLevel = 0   // on commence au niveau 0 (catégories)
  let currentCategory = 0          // 1re catégorie (Street)
  let currentPhrase = 0            // 1re phrase
  let kanjiIndex = 0               // index global pour le mode "All categories"

  // ── INITIALISATION DU BRIDGE ───────────────────────────
  try {
    // "await waitForEvenAppBridge()" = "attends que les lunettes
    // soient connectées". Si on est sur un navigateur normal
    // (pas dans l'app Even Realities), ça va échouer → le catch
    // plus bas va afficher l'UI companion.
    const bridge = await waitForEvenAppBridge()

    // ── PREMIER RENDU : catégories + logo ────────────────
    renderCategoryList(bridge)

    // ═══════════════════════════════════════════════════════
    // DÉFINITION DES CALLBACKS
    // ═══════════════════════════════════════════════════════
    //
    // Ce sont les fonctions qu'on va passer à setupInputHandlers.
    // Chacune décrit CE QUI SE PASSE quand l'utilisateur fait
    // un geste. input.ts ne connaît pas ces fonctions — il les
    // appelle juste au bon moment.

    // getLevel : retourne le niveau actuel.
    // C'est une "arrow function" (fonction fléchée) : () => level
    // Elle capture la variable "level" définie plus haut.
    // On la passe en fonction plutôt qu'en valeur parce que level
    // change au fil du temps — on veut sa valeur AU MOMENT DE L'APPEL.
    const getLevel = () => level

    // ── CALLBACK : Sélectionner une catégorie ─────────────
    const onSelectCategory = (idx: number) => {
      // Si l'utilisateur tape sur "All categories" (index 7)
      if (idx === ALL_CAT_INDEX) {
        currentCategory = ALL_CAT_INDEX   // on se souvient qu'on est en mode "all"
        kanjiIndex = 0                    // on commence à la 1re phrase (index 0)
        level = 2                         // on saute DIRECTEMENT au niveau 2 (détail)
        // On affiche la 1re phrase de l'index global
        const {catIdx, phrIdx} = ALL_PHRASES[0]
        renderDetail(bridge, catIdx, phrIdx)
        return  // on sort, on ne va pas plus loin
      }

      // Sinon, c'est une vraie catégorie (Street, Casual...)
      currentCategory = idx     // on retient l'index de la catégorie
      currentPhrase = 0         // on commence à la 1re phrase
      level = 1                 // on passe au niveau 1 (liste des phrases)
      renderPhraseList(bridge, currentCategory)
    }

    // ── CALLBACK : Sélectionner une phrase ───────────────
    const onSelectPhrase = (idx: number) => {
      currentPhrase = idx       // on retient l'index de la phrase
      level = 2                 // on passe au niveau 2 (détail)
      renderDetail(bridge, currentCategory, currentPhrase)
    }

    // ── CALLBACK : Phrase suivante ───────────────────────
    const onNext = () => {
      // CAS A : mode "All categories"
      if (level === 2 && currentCategory === ALL_CAT_INDEX) {
        // kanjiIndex = (kanjiIndex + 1) % ALL_PHRASES.length
        // → on avance d'un cran. Le % (modulo) fait qu'après la
        //   dernière phrase, on revient à la première (cyclique).
        kanjiIndex = (kanjiIndex + 1) % ALL_PHRASES.length
        const {catIdx, phrIdx} = ALL_PHRASES[kanjiIndex]
        renderDetail(bridge, catIdx, phrIdx)
        return
      }
      // CAS B : mode normal (dans une catégorie)
      // (currentPhrase + 1) % total → phrase suivante, cyclique
      currentPhrase = (currentPhrase + 1) % categories[currentCategory].phrases.length
      renderDetail(bridge, currentCategory, currentPhrase)
    }

    // ── CALLBACK : Phrase précédente ─────────────────────
    const onPrev = () => {
      // Même logique que onNext, mais en arrière
      if (level === 2 && currentCategory === ALL_CAT_INDEX) {
        // (kanjiIndex - 1 + TOTAL) % TOTAL
        // Le "+ TOTAL" évite d'avoir un index négatif quand on est à 0.
        // Ex: (0 - 1 + 80) % 80 = 79 (dernière phrase)
        kanjiIndex = (kanjiIndex - 1 + ALL_PHRASES.length) % ALL_PHRASES.length
        const {catIdx, phrIdx} = ALL_PHRASES[kanjiIndex]
        renderDetail(bridge, catIdx, phrIdx)
        return
      }
      const total = categories[currentCategory].phrases.length
      currentPhrase = (currentPhrase - 1 + total) % total
      renderDetail(bridge, currentCategory, currentPhrase)
    }

    // ── CALLBACK : Revenir en arrière ────────────────────
    const onBack = () => {
      // CAS A : mode "All categories" → retour direct au niveau 0
      if (level === 2 && currentCategory === ALL_CAT_INDEX) {
        level = 0
        currentCategory = 0
        renderCategoryList(bridge)
        return
      }
      // CAS B : niveau 2 → retour au niveau 1 (liste des phrases)
      if (level === 2) {
        level = 1
        renderPhraseList(bridge, currentCategory)
      // CAS C : niveau 1 → retour au niveau 0 (liste des catégories)
      } else if (level === 1) {
        level = 0
        renderCategoryList(bridge)
      }
      // Note : niveau 0 + double-tap = quitter l'app (géré dans input.ts)
    }

    // ── CONNECTER LES ENTRÉES À L'AFFICHAGE ──────────────
    // On passe les 7 callbacks à setupInputHandlers.
    // À partir de maintenant, chaque geste sur les lunettes
    // appellera la bonne callback.
    setupInputHandlers(
      bridge, getLevel,
      onSelectCategory, onSelectPhrase,
      onNext, onPrev, onBack
    )

  } catch {
    // Si on arrive ici, c'est que waitForEvenAppBridge() a échoué
    // → on n'est PAS sur les lunettes (navigateur normal ou simulateur)
    console.log('Bad Parrot: Bridge not available')
    console.log('Categories:', categories.length)
    // L'UI companion (le <div id="phone-ui"> dans index.html)
    // sera affichée par défaut car #g2-status est caché en CSS.
  }
}

// ═══════════════════════════════════════════════════════════════
// 4. DÉMARRAGE
// ═══════════════════════════════════════════════════════════════

// On appelle main(). Comme c'est une fonction async, elle retourne
// une promesse, mais on n'a pas besoin d'attendre — le navigateur
// gère ça tout seul.
main()

// ═══════════════════════════════════════════════════════════════
// RÉSUMÉ DE CE FICHIER
// ═══════════════════════════════════════════════════════════════
//
// main.ts est le chef d'orchestre. Il :
//   1. Définit l'état (niveau, catégorie, phrase)
//   2. Définit les callbacks (que faire pour chaque action)
//   3. Connecte tout : les entrées → les callbacks → l'affichage
//   4. Gère le cas "pas de lunettes" (UI companion)
//
// SCHÉMA DE NAVIGATION :
//
//   Level 0 (catégories)
//     │
//     ├── tap "Street" → Level 1 (phrases de Street)
//     │                     │
//     │                     ├── tap "ありがとう" → Level 2 (détail)
//     │                     │     swipe ↑↓ = prev/next
//     │                     │     double-tap = retour Level 1
//     │                     │
//     │                     └── double-tap = retour Level 0
//     │
//     ├── tap "All categories" → Level 2 DIRECT (toutes les phrases)
//     │     swipe ↑↓ = prev/next (à travers TOUTES les catégories)
//     │     double-tap = retour Level 0
//     │
//     └── double-tap = quitter l'app
//
// LES 2 CONCEPTS LES PLUS IMPORTANTS :
//   1. ASYNC/AWAIT : pour ne pas bloquer l'app pendant les opérations lentes
//   2. CALLBACKS : pour découpler les entrées de l'affichage

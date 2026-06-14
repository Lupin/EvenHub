/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  BAD PARROT — ÉTUDE DE CODE                                ║
 * ║  Fichier 3/6 : display/index.ts — L'affichage sur lunettes ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * CE FICHIER SERT À QUOI ?
 * ─────────────────────────
 * C'est le "moteur d'affichage" : il transforme les données
 * (data.ts) en pixels sur l'écran des lunettes G2.
 *
 * CONCEPT CLÉ N°1 : LES CONTAINERS (CONTENEURS)
 * ─────────────────────────────────────────────
 * Sur G2, on ne fait pas de HTML/CSS. On utilise des "containers",
 * des boîtes rectangulaires qu'on place à des coordonnées (x,y).
 * Il y a 3 types de containers :
 *   - TextContainerProperty  : pour afficher du texte
 *   - ListContainerProperty  : pour une liste scrollable
 *   - ImageContainerProperty : pour une image 4-bit greyscale
 *
 * CONCEPT CLÉ N°2 : CRÉATION VS MISE À JOUR
 * ──────────────────────────────────────────
 * - createStartUpPageContainer : crée la page UNE SEULE FOIS au début
 * - rebuildPageContainer       : détruit tout et recrée (quand on change de layout)
 * - textContainerUpgrade       : change juste le texte, sans détruire (plus rapide)
 *
 * CONCEPT CLÉ N°3 : LE BRIDGE
 * ────────────────────────────
 * Le "bridge" c'est l'objet qui parle aux lunettes. Toutes les
 * fonctions d'affichage le reçoivent en paramètre. C'est le pont
 * entre ton code JS et le firmware des lunettes.
 */

// ═══════════════════════════════════════════════════════════════
// 1. IMPORTS — Les briques SDK et les données
// ═══════════════════════════════════════════════════════════════

// EvenAppBridge : le type du bridge (pour TypeScript)
import type { EvenAppBridge } from '@evenrealities/even_hub_sdk'

// Les classes du SDK qu'on va utiliser
import {
  CreateStartUpPageContainer,    // pour créer la page initiale
  RebuildPageContainer,          // pour reconstruire la page
  ListContainerProperty,         // un conteneur de type "liste"
  ListItemContainerProperty,     // les items à l'intérieur d'une liste
  TextContainerProperty,         // un conteneur de type "texte"
  ImageContainerProperty,        // un conteneur de type "image"
  ImageRawDataUpdate,            // pour envoyer des bytes d'image
} from '@evenrealities/even_hub_sdk'

// Nos données et constantes (définies dans les fichiers 1 et 2)
import { categories } from '../data'
import { ANCHOR_Y, condense } from '../types'
import type { NavigationLevel } from '../types'

// ═══════════════════════════════════════════════════════════════
// 2. VARIABLES D'ÉTAT DU MODULE
// ═══════════════════════════════════════════════════════════════

// Un "flag" (drapeau) qui indique si la page a déjà été créée.
// La 1re fois on utilise createStartUpPageContainer,
// les fois suivantes on utilise rebuildPageContainer.
// C'est un peu comme la différence entre "construire la maison"
// et "repeindre les murs".
let pageCreated = false

// ═══════════════════════════════════════════════════════════════
// 3. CONSTANTES DE LAYOUT — Où placer les éléments sur l'écran
// ═══════════════════════════════════════════════════════════════

// L'écran G2 fait 576×288 pixels. On divise en zones.
// Pour le Level 0 (liste des catégories), on fait 2 colonnes :
//   - Colonne gauche : la liste (220px de large)
//   - Colonne droite : le logo de l'app (288px, le max SDK)

const LIST_W = 220                 // largeur de la liste de catégories
const LIST_H = 280                 // hauteur de la liste
const RIGHT_X = 232                // position X du logo (4 + 220 + 8 de gap)
                                   //   → 4px de marge gauche
                                   //   → + 220px pour la liste
                                   //   → + 8px d'espace entre liste et logo
                                   //   → = 232
const RIGHT_W = 288                // largeur max autorisée par le SDK pour une image
const IMG_H = 144                  // hauteur max autorisée par le SDK pour une image

// Centrer le logo verticalement par rapport à la liste :
//   ANCHOR_Y = 20 (le haut de la liste)
//   LIST_H = 280 (hauteur de la liste)
//   IMG_H = 144 (hauteur du logo)
//   → Y du logo = 20 + (280 - 144) / 2 = 20 + 68 = 88
const THUMB_Y = ANCHOR_Y + (LIST_H - IMG_H) / 2

// ═══════════════════════════════════════════════════════════════
// 4. FONCTIONS D'AFFICHAGE — Une par niveau
// ═══════════════════════════════════════════════════════════════

/**
 * LEVEL 0 — Liste des catégories (page d'accueil de l'app)
 * ─────────────────────────────────────────────────────────
 * Affiche la liste des 7 catégories + "All categories" à gauche,
 * et le logo Bad Parrot à droite.
 *
 * @param bridge  Le pont de communication avec les lunettes
 */
export function renderCategoryList(bridge: EvenAppBridge): void {
  // On crée la liste des noms à afficher.
  // categories.map(c => c.name) = transforme chaque catégorie en son nom.
  // Le "...tableau" (spread operator) ÉTALE le tableau.
  // [...noms, 'All categories'] = tous les noms + un 8e élément à la fin.
  const names = [...categories.map(c => c.name), 'All categories']

  // ── Conteneur 1 : la liste des catégories ──
  // ListContainerProperty = un "bloc liste" avec scroll natif.
  // Le SDK gère le défilement, la surbrillance, le tap sur un item.
  const list = new ListContainerProperty({
    containerID: 1,              // numéro unique du conteneur sur cette page
    containerName: 'cats',       // nom (max 16 caractères) pour le référencer plus tard
    xPosition: 4,                // 4px depuis le bord gauche
    yPosition: ANCHOR_Y,         // 20px depuis le haut (pour éviter le bord)
    width: LIST_W,               // 220px
    height: LIST_H,              // 280px
    isEventCapture: 1,           // ⚠️ CE conteneur capture les événements (tap, scroll)
                                 //     Un seul conteneur par page peut avoir ça à 1.
    // Les items de la liste. itemCount = nombre d'items.
    // itemWidth = largeur de chaque item (un peu moins que le conteneur).
    // isItemSelectBorderEn = 1 → affiche une bordure sur l'item sélectionné.
    // itemName = le tableau des textes à afficher.
    itemContainer: new ListItemContainerProperty({
      itemCount: names.length,         // 8 items (7 catégories + "All categories")
      itemWidth: LIST_W - 8,           // 212px (220 - 8 de padding)
      isItemSelectBorderEn: 1,         // bordure de sélection visible
      itemName: names,                 // les noms : ["Street", "Casual", ...]
    }),
  })

  // ── Conteneur 2 : le logo (image) ──
  const logo = new ImageContainerProperty({
    containerID: 2,
    containerName: 'appLogo',
    xPosition: RIGHT_X,           // 232px (à droite de la liste)
    yPosition: THUMB_Y,           // 88px (centré verticalement)
    width: RIGHT_W,               // 288px (max SDK)
    height: IMG_H,                // 144px (max SDK)
    // Pas de isEventCapture ici → ce conteneur est purement décoratif
  })

  // ── Créer ou reconstruire la page ──
  // Si c'est la PREMIÈRE FOIS : createStartUpPageContainer (crée tout)
  // Si c'est un RETOUR au niveau 0 : rebuildPageContainer (détruit et recrée)
  if (!pageCreated) {
    bridge.createStartUpPageContainer(
      new CreateStartUpPageContainer({
        containerTotalNum: 2,       // 2 conteneurs sur cette page
        listObject: [list],         // le(s) conteneur(s) de type liste
        imageObject: [logo],        // le(s) conteneur(s) de type image
      })
    )
    pageCreated = true            // on note que la page est créée
  } else {
    bridge.rebuildPageContainer(
      new RebuildPageContainer({
        containerTotalNum: 2,
        listObject: [list],
        imageObject: [logo],
      })
    )
  }

  // ── Pousser l'image du logo ──
  // Les images ne sont PAS envoyées pendant le create/rebuild.
  // On doit le faire APRÈS, avec updateImageRawData.
  // .catch() = si ça échoue, on log l'erreur sans planter l'app.
  loadAndPushLogo(bridge).catch(err =>
    console.error('loadAndPushLogo failed:', err)
  )
}

/**
 * LEVEL 1 — Liste des phrases dans une catégorie
 * ──────────────────────────────────────────────
 * Affiche toutes les phrases d'une catégorie sous forme de liste.
 *
 * @param bridge   Le pont de communication
 * @param catIndex L'index de la catégorie (0 = Street, 1 = Casual...)
 */
export function renderPhraseList(bridge: EvenAppBridge, catIndex: number): void {
  // categories[catIndex] = la catégorie correspondant à l'index
  // Ex: si catIndex = 2 → categories[2] = la catégorie "Gen Z"
  const cat = categories[catIndex]

  // On extrait juste les noms anglais des phrases
  // p.en = la traduction anglaise de la phrase
  const names = cat.phrases.map(p => p.en)

  // Un seul conteneur : la liste en plein écran
  const list = new ListContainerProperty({
    containerID: 1,
    containerName: 'phrases',
    xPosition: 4,
    yPosition: ANCHOR_Y,
    width: 568,                   // quasi pleine largeur
    height: 280,
    isEventCapture: 1,            // capture les taps sur les items
    itemContainer: new ListItemContainerProperty({
      itemCount: names.length,
      itemWidth: 560,             // 568 - 8 de padding
      isItemSelectBorderEn: 1,
      itemName: names,
    }),
  })

  // Level 1 arrive APRÈS Level 0, donc pageCreated est déjà true.
  // On utilise rebuildPageContainer (pas create).
  bridge.rebuildPageContainer(
    new RebuildPageContainer({ containerTotalNum: 1, listObject: [list] })
  )
}

/**
 * LEVEL 2 — Détail d'une phrase (image kanji + texte)
 * ───────────────────────────────────────────────────
 * Layout empilé (stacked) :
 *   - En haut : l'image du kanji (288×144, centrée)
 *   - En bas  : le texte (japonais, prononciation, trad, catégorie)
 *
 * @param bridge       Le pont de communication
 * @param catIndex     Index de la catégorie
 * @param phraseIndex  Index de la phrase dans cette catégorie
 */
export function renderDetail(
  bridge: EvenAppBridge,
  catIndex: number,
  phraseIndex: number
): void {
  const cat = categories[catIndex]
  const p = cat.phrases[phraseIndex]    // la phrase sélectionnée
  const total = cat.phrases.length      // combien de phrases dans cette catégorie

  // Le "footer" : nom de la catégorie + position (ex: "Street  3/10")
  const footer = `${cat.name}  ${phraseIndex + 1}/${total}`

  // Le contenu texte : 4 lignes séparées par des \n (retours à la ligne)
  //   Ligne 1 : le japonais (ex: ありがとう)
  //   Ligne 2 : la prononciation (ex: arigatou)
  //   Ligne 3 : la traduction (ex: Thank you)
  //   Ligne 4 : le footer
  const content = `${p.jp}\n${p.ph}\n${p.en}\n${footer}`

  // ── Conteneur 1 : l'image du kanji (en haut) ──
  const image = new ImageContainerProperty({
    containerID: 2,
    containerName: 'kanjiImg',
    // Centré horizontalement : (576 - 288) / 2 = 144
    xPosition: (576 - 288) / 2,
    yPosition: 0,                 // tout en haut
    width: 288,                   // largeur max image SDK
    height: 144,                  // hauteur max image SDK
  })

  // ── Conteneur 2 : le texte (en dessous de l'image) ──
  const text = new TextContainerProperty({
    containerID: 1,
    containerName: 'kanjiText',
    content,                      // le texte formaté avec \n
    xPosition: 4,
    yPosition: 150,               // 144 (hauteur image) + 6px de marge = 150
    width: 568,
    height: 134,                  // le reste de l'écran (288 - 150 - 4 = 134)
    isEventCapture: 1,            // ⚠️ C'EST LE TEXTE qui capture les événements
                                  //     (swipe ↑↓ et double-tap), PAS l'image
  })

  // reconstruire la page avec 2 conteneurs (1 texte + 1 image)
  bridge.rebuildPageContainer(
    new RebuildPageContainer({
      containerTotalNum: 2,
      textObject: [text],          // les conteneurs texte
      imageObject: [image],        // les conteneurs image
    })
  )

  // Pousser l'image du kanji (asynchrone, après la reconstruction)
  loadAndPushKanjiImage(bridge, catIndex, phraseIndex).catch(err =>
    console.error('loadAndPushKanjiImage failed:', err)
  )
}

// ═══════════════════════════════════════════════════════════════
// 5. FONCTIONS DE CHARGEMENT D'IMAGES
// ═══════════════════════════════════════════════════════════════

/**
 * Charge et envoie le logo statique de l'app sur les lunettes.
 *
 * POURQUOI UN CANVAS ?
 * ─────────────────────
 * Le SDK des lunettes REJETTE les fichiers PNG bruts (bug connu).
 * La solution : re-encoder l'image avec l'API Canvas du navigateur.
 * Mêmes pixels, mais le format binaire est accepté.
 *
 * ÉTAPES :
 *   1. fetch() → télécharger l'image depuis le serveur
 *   2. new Image() → charger les pixels en mémoire
 *   3. canvas.drawImage() → redessiner sur un canvas
 *   4. canvas.toBlob() → ré-exporter en PNG
 *   5. bridge.updateImageRawData() → envoyer aux lunettes
 */
async function loadAndPushLogo(bridge: EvenAppBridge): Promise<void> {
  // URL de l'image. "/" = racine du serveur Vite = dossier public/
  // Donc "/images/category/logo.png" → public/images/category/logo.png
  const url = '/images/category/logo.png'

  // ── Étape 1 : Télécharger ──
  const resp = await fetch(url)
  if (!resp.ok) {
    console.error(`Logo not found: ${url}`)
    return
  }
  const blob = await resp.blob()  // blob = données binaires brutes

  // ── Étape 2 : Charger dans une balise <img> ──
  // URL.createObjectURL() crée une URL temporaire pointant vers le blob.
  // On enveloppe le chargement dans une Promise pour pouvoir utiliser await.
  const objectUrl = URL.createObjectURL(blob)
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = document.createElement('img')
    el.onload = () => resolve(el)   // succès → on renvoie l'élément <img>
    el.onerror = () => reject(new Error('Image load failed'))
    el.src = objectUrl              // on assigne l'URL → le navigateur charge l'image
  })

  // ── Étape 3 : Redessiner sur un canvas ──
  const canvas = document.createElement('canvas')
  canvas.width = RIGHT_W          // 288px
  canvas.height = IMG_H           // 144px
  // getContext('2d') retourne le "pinceau" pour dessiner sur le canvas.
  // Le "!" dit à TypeScript "je suis sûr que ce n'est pas null" (car on vient de le créer).
  canvas.getContext('2d')!.drawImage(img, 0, 0, RIGHT_W, IMG_H)
  URL.revokeObjectURL(objectUrl)  // libérer la mémoire de l'URL temporaire

  // ── Étape 4 : Ré-exporter en PNG ──
  const outBlob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(b => b ? resolve(b) : reject(new Error('toBlob failed')), 'image/png')
  )

  // ── Étape 5 : Convertir en Uint8Array et envoyer ──
  const bytes = new Uint8Array(await outBlob.arrayBuffer())
  const containerName = 'appLogo'  // pour le message d'erreur

  const result = await bridge.updateImageRawData(
    new ImageRawDataUpdate({
      containerID: 2,              // doit correspondre au containerID défini plus haut
      containerName: 'appLogo',    // idem
      imageData: bytes,            // les bytes de l'image
    })
  )

  // Vérifier le résultat
  if (result !== 'success') {
    console.error(`updateImageRawData (${containerName}):`, result)
    // 'sendFailed' = problème Bluetooth
    // 'imageException' = format rejeté
    // 'imageSizeInvalid' = dimensions hors limites
  }
}

// ── Constantes pour les images de kanji ─────────────────────

const KANJI_IMG_W = 288
const KANJI_IMG_H = 144

/**
 * Charge et envoie l'image d'un kanji sur les lunettes.
 * Même mécanisme que loadAndPushLogo, mais pour les kanjis individuels.
 *
 * @param bridge       Le pont de communication
 * @param catIndex     Index de la catégorie
 * @param phraseIndex  Index de la phrase
 */
async function loadAndPushKanjiImage(
  bridge: EvenAppBridge,
  catIndex: number,
  phraseIndex: number
): Promise<void> {
  // Les images sont nommées "catIndex_phraseIndex.png"
  // Ex: "/images/kanji/0_0.png" = 1re phrase de Street (ありがとう)
  const url = `/images/kanji/${catIndex}_${phraseIndex}.png`

  // Mêmes étapes que loadAndPushLogo :
  const resp = await fetch(url)
  if (!resp.ok) {
    console.error(`Kanji image not found: ${url}`)
    return
  }
  const blob = await resp.blob()
  const objectUrl = URL.createObjectURL(blob)

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = document.createElement('img')
    el.onload = () => resolve(el)
    el.onerror = () => reject(new Error('Image load failed'))
    el.src = objectUrl
  })

  const canvas = document.createElement('canvas')
  canvas.width = KANJI_IMG_W
  canvas.height = KANJI_IMG_H
  canvas.getContext('2d')!.drawImage(img, 0, 0, KANJI_IMG_W, KANJI_IMG_H)
  URL.revokeObjectURL(objectUrl)

  const outBlob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(b => b ? resolve(b) : reject(new Error('toBlob failed')), 'image/png')
  )
  const bytes = new Uint8Array(await outBlob.arrayBuffer())

  const result = await bridge.updateImageRawData(
    new ImageRawDataUpdate({
      containerID: 2,
      containerName: 'kanjiImg',
      imageData: bytes,
    })
  )
  if (result !== 'success') {
    console.error('updateImageRawData:', result)
  }
}

// ═══════════════════════════════════════════════════════════════
// RÉSUMÉ DE CE FICHIER
// ═══════════════════════════════════════════════════════════════
//
// display/index.ts exporte 3 fonctions publiques :
//   1. renderCategoryList(bridge)        → Level 0 : liste des catégories + logo
//   2. renderPhraseList(bridge, catIdx)  → Level 1 : liste des phrases
//   3. renderDetail(bridge, cat, phr)    → Level 2 : détail kanji + texte
//
// Et 2 fonctions privées pour charger les images :
//   - loadAndPushLogo()
//   - loadAndPushKanjiImage()
//
// PATTERN CLÉ : séparation données / affichage.
//   → Les données sont dans data.ts
//   → L'affichage est ici
//   → La navigation est dans main.ts
//
// Chaque niveau est une fonction indépendante. Quand on change de
// niveau, main.ts appelle la bonne fonction. Simple et prévisible.

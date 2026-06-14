╔══════════════════════════════════════════════════════════════════╗
║  BAD PARROT — ÉTUDE DE CODE COMMENTÉ EN FRANÇAIS               ║
║  Pour apprendre TypeScript et le SDK G2 pas à pas              ║
╚══════════════════════════════════════════════════════════════════╝

ORDRE DE LECTURE RECOMMANDÉ (du plus simple au plus complexe) :

  1. 01-types.ts       (~10 min)  Les définitions de types
     → interface, type, export, const
     → Le fichier le plus simple, pour se mettre en jambes

  2. 02-data.ts        (~10 min)  Les données de l'app
     → tableaux, objets, interfaces appliquées
     → Comprendre comment les 80 phrases sont stockées

  3. 06-index.html     (~15 min)  La page web
     → HTML, CSS, variables CSS, thèmes
     → Pas de TypeScript, juste du balisage

  4. 04-input.ts       (~15 min)  La gestion des événements
     → callbacks, piège CLICK_EVENT=0, switch/case
     → LE fichier le plus important à comprendre

  5. 03-display.ts     (~20 min)  L'affichage sur les lunettes
     → containers SDK, canvas, async/await
     → Le plus long, mais très commenté

  6. 05-main.ts        (~20 min)  Le chef d'orchestre
     → navigation, état, async/await, boucles for
     → Tout se connecte ici


CONCEPTS CLÉS À RETENIR (valables pour TOUS les projets G2) :

  ▸ CLICK_EVENT = 0 est FALSY → toujours comparer avec !== undefined
  ▸ Un seul conteneur par page doit avoir isEventCapture: 1
  ▸ Les images doivent passer par un canvas (pas de PNG brut)
  ▸ textContainerUpgrade pour mise à jour (flicker-free)
  ▸ rebuildPageContainer pour changement de layout
  ▸ createStartUpPageContainer une seule fois au début
  ▸ Double-tap doit appeler shutDownPageContainer(1) (obligatoire store)
  ▸ ContainerName : max 16 caractères
  ▸ ListContainer : max 20 items, 64 caractères par item
  ▸ ImageContainer : max 288×144 pixels

FICHIERS ORIGINAUX (non commentés, dans le vrai projet) :
  /Users/gael/Documents/GitHub/EvenHub/bad parrot/src/

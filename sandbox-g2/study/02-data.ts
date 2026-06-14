/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  BAD PARROT — ÉTUDE DE CODE                                ║
 * ║  Fichier 2/6 : data.ts — Les données de l'app              ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * CE FICHIER SERT À QUOI ?
 * ─────────────────────────
 * Il contient TOUTES les données de l'app : les catégories,
 * les phrases japonaises, leurs prononciations et traductions.
 *
 * Dans une app plus grosse, ces données viendraient d'une API
 * ou d'une base de données. Ici, tout est "en dur" dans le code.
 * C'est simple, rapide, et ça marche sans Internet.
 *
 * CONCEPT CLÉ : les données et le code d'affichage sont SÉPARÉS.
 * data.ts ne sait rien des lunettes. display/index.ts ne contient
 * aucune phrase en dur. Si on veut ajouter une phrase, on touche
 * UNIQUEMENT ce fichier.
 */

// ═══════════════════════════════════════════════════════════════
// 1. INTERFACES — La forme de nos données
// ═══════════════════════════════════════════════════════════════

/**
 * Une phrase à afficher.
 *
 * Une "interface" c'est un contrat : tout objet qui se dit "Phrase"
 * DOIT avoir ces 3 propriétés, avec ces types exacts.
 *
 * Propriétés :
 *   jp : le texte en japonais (kanji/kana)
 *   ph : la prononciation phonétique (Hepburn modifié)
 *   en : la traduction anglaise
 */
export interface Phrase {
  jp: string   // ex: "ありがとう"
  ph: string   // ex: "arigatou"
  en: string   // ex: "Thank you"
}

/**
 * Une catégorie de phrases.
 *
 * Une catégorie contient :
 *   id   : un identifiant unique (pour les URLs d'images, etc.)
 *   name : le nom affiché (en anglais)
 *   phrases : un TABLEAU de Phrase (le "[]" veut dire "tableau de")
 */
export interface Category {
  id: string           // ex: "street", "casual", "genz"
  name: string         // ex: "Street", "Casual", "Gen Z"
  phrases: Phrase[]    // le [] signifie "tableau de Phrase"
}

// ═══════════════════════════════════════════════════════════════
// 2. CONSTANTE — La légende de prononciation
// ═══════════════════════════════════════════════════════════════

/**
 * Légende affichée dans l'app companion pour expliquer comment
 * lire les prononciations.
 *
 * Hepburn modifié :
 *   a = ah (comme "papa")
 *   i = ee (comme "ici")
 *   u = oo (comme "ou")
 *   e = eh (comme "été")
 *   o = oh (comme "eau")
 *   ·u = muet (le "u" dans "desu" ne se prononce pas)
 *   r = tapé (entre L et R, un coup de langue rapide)
 */
export const PRONUNCIATION_KEY = 'a=ah i=ee u=oo e=eh o=oh ·u=muet r=tapé'

// ═══════════════════════════════════════════════════════════════
// 3. DONNÉES PRINCIPALES — Le tableau des catégories
// ═══════════════════════════════════════════════════════════════

/**
 * LE TABLEAU PRINCIPAL — 7 catégories, 8-12 phrases chacune (~80 au total).
 *
 * categories est un "tableau de Category" (Category[]).
 * Chaque élément est un objet { id, name, phrases }.
 * phrases est lui-même un tableau d'objets { jp, ph, en }.
 *
 * POUR ACCÉDER À UNE PHRASE :
 *   categories[2]              → la 3e catégorie (Gen Z)
 *   categories[2].phrases[0]   → la 1re phrase de Gen Z
 *   categories[2].phrases[0].jp → "あざまる"
 *
 * TABLEAUX EN JS (rappel) :
 *   const t = ['a', 'b', 'c']
 *   t[0]    → 'a'  (les index commencent à 0 !)
 *   t.length → 3
 */
export const categories: Category[] = [

  // ── Catégorie 1 : Street (index 0) ──────────────────────
  // Phrases "passe-partout" utiles dans la rue, les magasins.
  {
    id: 'street',
    name: 'Street',
    phrases: [
      { jp: 'ありがとう',            ph: 'arigatou',              en: 'Thank you' },
      { jp: 'おいしい',              ph: 'oishii',                en: 'This is tasty' },
      { jp: 'ごめん',                ph: 'gomen',                 en: 'Sorry' },
      { jp: 'いいね',                ph: 'ii ne',                 en: 'Sounds good' },
      { jp: 'まじ？',                ph: 'maji?',                 en: 'Really? / No way!' },
      { jp: '行こう',                ph: 'ikou',                  en: 'Let\'s go' },
      { jp: 'おつかれ',              ph: 'otsukare',              en: 'Good work / Hey' },
      { jp: 'すごい',                ph: 'sugoi',                 en: 'Amazing!' },
      { jp: '乾杯！',                ph: 'kanpai!',               en: 'Cheers!' },
      { jp: 'またね',                ph: 'mata ne',               en: 'See you later' },
    ]
  },

  // ── Catégorie 2 : Casual (index 1) ──────────────────────
  // Version plus relâchée/décontractée des phrases street.
  {
    id: 'casual',
    name: 'Casual',
    phrases: [
      { jp: 'あざす',                ph: 'azasu',                 en: 'Thanks (short)' },
      { jp: 'うまっ！',              ph: 'uma\'!',                en: 'So good!' },
      { jp: 'わりぃ',                ph: 'warii',                 en: 'My bad' },
      { jp: 'それな',                ph: 'sore na',               en: 'Facts! / Exactly' },
      { jp: 'マジで？',              ph: 'maji de?',              en: 'For real?' },
      { jp: '行くぞ',                ph: 'ikuzo',                 en: 'Let\'s go! (rough)' },
      { jp: 'すげえ',                ph: 'sugee',                 en: 'Insane! (masc)' },
      { jp: 'めっちゃいい',          ph: 'meccha ii',             en: 'Really nice' },
      { jp: '超楽しい',              ph: 'chou tanoshii',         en: 'Super fun' },
      { jp: 'サボろう',              ph: 'saborou',               en: 'Let\'s skip / slack' },
    ]
  },

  // ── Catégorie 3 : Gen Z (index 2) ───────────────────────
  // Argot des jeunes Japonais (nés après 2000).
  {
    id: 'genz',
    name: 'Gen Z',
    phrases: [
      { jp: 'あざまる',              ph: 'azamaru',               en: 'Thanks! (Gen Z)' },
      { jp: 'ばりうま',              ph: 'bari uma',              en: 'Insanely good' },
      { jp: 'それガチ？',            ph: 'sore gachi?',           en: 'Wait, for real?' },
      { jp: 'やばい',                ph: 'yabai',                 en: 'Insane! (pos/neg)' },
      { jp: 'エモい',                ph: 'emoi',                  en: 'That hits / nostalgic' },
      { jp: 'あげぽよ',              ph: 'age-poyo',              en: 'Let\'s get hype!' },
      { jp: '鬼うま',                ph: 'oni uma',               en: 'Demon-level tasty' },
      { jp: 'チルしよう',            ph: 'chiru shiyou',          en: 'Let\'s chill' },
      { jp: '神ってる',              ph: 'kamitteru',             en: 'God-tier / legendary' },
      { jp: 'ぱりぴ',                ph: 'paripi',                en: 'Party people!' },
    ]
  },

  // ── Catégorie 4 : Kansai (index 3) ──────────────────────
  // Dialecte de la région Osaka/Kyoto/Kobe.
  {
    id: 'kansai',
    name: 'Kansai',
    phrases: [
      { jp: 'おおきに',              ph: 'ookini',                en: 'Thank you (Kansai)' },
      { jp: 'めっちゃええ',          ph: 'meccha ee',             en: 'Really nice (Kansai)' },
      { jp: 'なんでやねん',          ph: 'nande yanen',           en: 'What the hell! (tsukkomi)' },
      { jp: 'しらんけど',            ph: 'shiran kedo',           en: 'I dunno though' },
      { jp: 'せやな',                ph: 'seya na',               en: 'Yeah, right (Kansai)' },
      { jp: 'ほんまに？',            ph: 'honma ni?',             en: 'For real? (Kansai)' },
      { jp: 'あかん',                ph: 'akan',                  en: 'No way / Can\'t' },
      { jp: 'ぎょうさん',            ph: 'gyousan',               en: 'A ton / Lots' },
    ]
  },

  // ── Catégorie 5 : Internet (index 4) ────────────────────
  // Argot des réseaux sociaux et du web japonais.
  {
    id: 'internet',
    name: 'Internet',
    phrases: [
      { jp: '草',                    ph: 'kusa',                  en: 'LOL' },
      { jp: 'ぴえん',                ph: 'pien',                  en: '😢 (cute sad)' },
      { jp: 'バズった',              ph: 'bazutta',               en: 'Went viral' },
      { jp: 'ググって',              ph: 'gugutte',               en: 'Google it' },
      { jp: 'ミスった',              ph: 'misutta',               en: 'I messed up' },
      { jp: 'ワンチャン',            ph: 'wanchan',               en: 'There\'s a chance' },
      { jp: 'ディスるな',            ph: 'disuru na',             en: 'Don\'t diss me' },
      { jp: 'それ草',                ph: 'sore kusa',             en: 'That\'s hilarious' },
    ]
  },

  // ── Catégorie 6 : Roast (index 5) ───────────────────────
  // Taquineries — à utiliser entre amis uniquement.
  {
    id: 'roast',
    name: 'Roast',
    phrases: [
      { jp: 'ばか',                  ph: 'baka',                  en: 'Idiot (playful)' },
      { jp: 'あほ',                  ph: 'aho',                   en: 'Idiot (Kansai)' },
      { jp: 'うざい',                ph: 'uzai',                  en: 'So annoying' },
      { jp: 'ださい',                ph: 'dasai',                 en: 'Lame / uncool' },
      { jp: 'キモい',                ph: 'kimoi',                 en: 'Gross / creepy' },
      { jp: 'クソ',                  ph: 'kuso',                  en: 'Crap! / Damn!' },
      { jp: 'ちくしょう',            ph: 'chikushou',             en: 'Damn it!' },
      { jp: 'うるさい',              ph: 'urusai',                en: 'Shut up / noisy' },
      { jp: 'ふざけんな',            ph: 'fuzakenna',             en: 'Don\'t mess with me' },
      { jp: 'しね',                  ph: 'shine',                 en: 'Drop dead (extreme)' },
    ]
  },

  // ── Catégorie 7 : WTF (index 6) ─────────────────────────
  // Expressions insolites qui font rire les Japonais quand
  // un étranger les sort.
  {
    id: 'wtf',
    name: 'WTF',
    phrases: [
      { jp: '別腹',                  ph: 'betsubara',             en: 'Dessert stomach (extra)' },
      { jp: '猫舌',                  ph: 'nekojita',              en: 'Cat tongue (can\'t do hot)' },
      { jp: '三日坊主',              ph: 'mikka bouzu',           en: '3-day monk (quitter)' },
      { jp: '口寂しい',              ph: 'kuchisabishii',         en: 'Lonely mouth (bored eating)' },
      { jp: 'ばたんきゅう',          ph: 'batankyuu',             en: 'Collapse! (dramatic)' },
      { jp: '空気読めない',          ph: 'kuuki yomenai',         en: 'Can\'t read the room' },
      { jp: '猫ばば',                ph: 'neko baba',             en: 'Hide the evidence' },
      { jp: 'バーコード人',          ph: 'baakoudo jin',          en: 'Barcode man (balding)' },
      { jp: '耳にたこ',              ph: 'mimi ni tako',          en: 'Heard it 1000× (ear callus)' },
      { jp: 'はなくそ',              ph: 'hana kuso',             en: 'Booger (lit. nose sh*t)' },
      { jp: 'パラサイト',            ph: 'parasaito',             en: 'Parasite (adult at parents\')' },
      { jp: '積ん読',                ph: 'tsundoku',              en: 'Book hoarder (never reads)' },
    ]
  },
]

// ═══════════════════════════════════════════════════════════════
// RÉSUMÉ DE CE FICHIER
// ═══════════════════════════════════════════════════════════════
//
// data.ts exporte :
//   1. Phrase (interface)     — { jp, ph, en }
//   2. Category (interface)   — { id, name, phrases: Phrase[] }
//   3. PRONUNCIATION_KEY      — la légende phonétique
//   4. categories (tableau)   — 7 catégories avec leurs phrases
//
// Pour ajouter une phrase, on ajoute un bloc { jp, ph, en }
// dans la catégorie voulue. Rien d'autre à changer.

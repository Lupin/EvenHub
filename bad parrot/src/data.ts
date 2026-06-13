// Bad Parrot — 7 categories × 8-12 phrases (⚠️ needs native speaker review)
// Phonetics: modified Hepburn (long vowels doubled, no macrons).

export interface Phrase {
  jp: string
  ph: string
  en: string
}

export interface Category {
  id: string
  name: string
  phrases: Phrase[]
}

export const PRONUNCIATION_KEY = 'a=ah i=ee u=oo e=eh o=oh ·u=muet r=tapé'

export const categories: Category[] = [
  // ── 1. Street ─────────────────────────────────────────
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

  // ── 2. Casual ─────────────────────────────────────────
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

  // ── 3. Gen Z ──────────────────────────────────────────
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

  // ── 4. Kansai ─────────────────────────────────────────
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

  // ── 5. Internet ───────────────────────────────────────
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

  // ── 6. Roast ──────────────────────────────────────────
  // Playful teasing only — not genuinely offensive
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

  // ── 7. WTF ────────────────────────────────────────────
  // Unusual/funny phrases that make Japanese people laugh
  // when a foreigner pronounces them
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

export type Language = 'en' | 'fr'

export interface Translations {
  appTitle: string; fastingType: string; schedule: string;
  fastStart: string; fastEnd: string; displayMode: string;
  textMode: string; textModeDesc: string; timelineMode: string; timelineModeDesc: string;
  custom: string; customDesc: string; cancel: string; save: string; language: string;
  fasting: string; eating: string; restDay: string;
  preset_14_10_name: string; preset_14_10_desc: string;
  preset_16_8_name: string; preset_16_8_desc: string;
  preset_18_6_name: string; preset_18_6_desc: string;
  preset_20_4_name: string; preset_20_4_desc: string;
  preset_23_1_name: string; preset_23_1_desc: string;
  preset_5_2_name: string; preset_5_2_desc: string;
  preset_5_2_week_name: string; preset_5_2_week_desc: string;
  preset_adf_name: string; preset_adf_desc: string;
}

export const translations: Record<Language, Translations> = {
  en: {
    appTitle: 'Fasting Tracker', fastingType: 'Fasting Type',
    schedule: 'Schedule', fastStart: 'Fast start', fastEnd: 'Fast end',
    displayMode: 'Display Mode', textMode: 'Text (corners)',
    textModeDesc: 'Discreet, upper corners', timelineMode: 'Timeline (bar)',
    timelineModeDesc: 'Day progress bar', custom: 'Custom',
    customDesc: 'Set your own hours', cancel: 'Cancel', save: 'Save',
    language: 'Language', fasting: 'FASTING', eating: 'EATING', restDay: 'REST DAY',
    preset_14_10_name: '14:10 — Beginner', preset_14_10_desc: '14h fast · 10h eating',
    preset_16_8_name: '16:8 — Leangains', preset_16_8_desc: '16h fast · 8h eating',
    preset_18_6_name: '18:6 — Extended', preset_18_6_desc: '18h fast · 6h eating',
    preset_20_4_name: '20:4 — Warrior Diet', preset_20_4_desc: '20h fast · 4h eating',
    preset_23_1_name: 'OMAD — One Meal A Day', preset_23_1_desc: '23h fast · 1 meal',
    preset_5_2_name: '5:2 — Weekday', preset_5_2_desc: '5d normal · 2d fast (Tue+Thu)',
    preset_5_2_week_name: '5:2 — Weekday', preset_5_2_week_desc: '5d normal · 2d fast (Tue+Thu)',
    preset_adf_name: 'ADF — Alternate Day', preset_adf_desc: 'Fast every other day',
  },
  fr: {
    appTitle: 'Suivi Jeûne', fastingType: 'Type de jeûne',
    schedule: 'Horaires', fastStart: 'Début du jeûne', fastEnd: 'Fin du jeûne',
    displayMode: 'Mode d\'affichage', textMode: 'Texte (coins)',
    textModeDesc: 'Discret, coins supérieurs', timelineMode: 'Barre (timeline)',
    timelineModeDesc: 'Barre de progression', custom: 'Personnalisé',
    customDesc: 'Définir vos horaires', cancel: 'Annuler', save: 'Enregistrer',
    language: 'Langue', fasting: 'JEÛNE', eating: 'REPAS', restDay: 'JOUR REPOS',
    preset_14_10_name: '14:10 — Débutant', preset_14_10_desc: '14h jeûne · 10h repas',
    preset_16_8_name: '16:8 — Leangains', preset_16_8_desc: '16h jeûne · 8h repas',
    preset_18_6_name: '18:6 — Avancé', preset_18_6_desc: '18h jeûne · 6h repas',
    preset_20_4_name: '20:4 — Warrior Diet', preset_20_4_desc: '20h jeûne · 4h repas',
    preset_23_1_name: 'OMAD — Un repas par jour', preset_23_1_desc: '23h jeûne · 1 repas',
    preset_5_2_name: '5:2 — Semaine', preset_5_2_desc: '5j normal · 2j jeûne (Mar+Jeu)',
    preset_5_2_week_name: '5:2 — Semaine', preset_5_2_week_desc: '5j normal · 2j jeûne (Mar+Jeu)',
    preset_adf_name: 'ADF — Jour alterné', preset_adf_desc: 'Jeûne un jour sur deux',
  },
}

export function t(lang: Language, key: keyof Translations): string {
  return translations[lang]?.[key] ?? translations.en[key] ?? key
}

export function getPresetName(id: string, lang: Language): string {
  const key = `preset_${id.replace(/[:-]/g, '_').toLowerCase()}_name` as keyof Translations
  return t(lang, key)
}

export function getPresetDesc(id: string, lang: Language): string {
  const key = `preset_${id.replace(/[:-]/g, '_').toLowerCase()}_desc` as keyof Translations
  return t(lang, key)
}

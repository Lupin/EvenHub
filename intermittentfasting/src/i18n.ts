import type { Language } from './types'

export type { Language }

export interface Translations {
  appTitle: string; fastingType: string; schedule: string;
  fastStart: string; fastEnd: string; displayMode: string;
  textMode: string; textModeDesc: string; timelineMode: string; timelineModeDesc: string;
  custom: string; customDesc: string; cancel: string; save: string; language: string;
  fasting: string; eating: string; restDay: string;
  timeFormat: string; h24: string; h12: string;
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
    appTitle: 'Intermittent Fasting', fastingType: 'Fasting Type',
    schedule: 'Schedule', fastStart: 'Fasting starts at', fastEnd: 'Fasting ends at',
    displayMode: 'Display Mode', textMode: 'Text (corners)',
    textModeDesc: 'Discreet, upper corners', timelineMode: 'Timeline (bar)',
    timelineModeDesc: 'Day progress bar', custom: 'Custom',
    customDesc: 'Set your own hours', cancel: 'Cancel', save: 'Save',
    language: 'Language', fasting: 'FASTING', eating: 'EATING', restDay: 'REST DAY',
    timeFormat: 'Time Format', h24: '24h', h12: '12h (AM/PM)',
    preset_14_10_name: '14:10 — Beginner', preset_14_10_desc: '14h fast · 10h eating',
    preset_16_8_name: '16:8 — Classic', preset_16_8_desc: '16h fast · 8h eating',
    preset_18_6_name: '18:6 — Intermediate', preset_18_6_desc: '18h fast · 6h eating',
    preset_20_4_name: '20:4 — Advanced', preset_20_4_desc: '20h fast · 4h eating',
    preset_23_1_name: 'OMAD — One Meal', preset_23_1_desc: '23h fast · 1 meal',
    preset_5_2_name: '5:2 — 2-Day', preset_5_2_desc: '5d eat · 2d fast',
    preset_5_2_week_name: '5:2 — 2-Day', preset_5_2_week_desc: '5d eat · 2d fast',
    preset_adf_name: 'ADF — Alternate', preset_adf_desc: 'Fast every other day',
  },
  fr: {
    appTitle: 'Intermittent Fasting', fastingType: 'Protocole',
    schedule: 'Horaires', fastStart: 'Début', fastEnd: 'Fin',
    displayMode: 'Affichage', textMode: 'Texte (coins)',
    textModeDesc: 'Discret, coins supérieurs', timelineMode: 'Barre',
    timelineModeDesc: 'Ligne de progression', custom: 'Perso',
    customDesc: 'Vos horaires', cancel: 'Annuler', save: 'Enregistrer',
    language: 'Langue', fasting: 'À JEUN', eating: 'REPAS', restDay: 'JOUR OFF',
    timeFormat: 'Format horaire', h24: '24h', h12: '12h (AM/PM)',
    preset_14_10_name: '14:10 — Débutant', preset_14_10_desc: '14h à jeun · 10h repas',
    preset_16_8_name: '16:8 — Classique', preset_16_8_desc: '16h à jeun · 8h repas',
    preset_18_6_name: '18:6 — Intermédiaire', preset_18_6_desc: '18h à jeun · 6h repas',
    preset_20_4_name: '20:4 — Avancé', preset_20_4_desc: '20h à jeun · 4h repas',
    preset_23_1_name: 'OMAD — Un repas', preset_23_1_desc: '23h à jeun · 1 repas',
    preset_5_2_name: '5:2 — 2 jours', preset_5_2_desc: '5j normal · 2j à jeun',
    preset_5_2_week_name: '5:2 — 2 jours', preset_5_2_week_desc: '5j normal · 2j à jeun',
    preset_adf_name: 'ADF — Alterné', preset_adf_desc: 'À jeun un jour sur deux',
  },
  es: {
    appTitle: 'Intermittent Fasting', fastingType: 'Protocolo',
    schedule: 'Horario', fastStart: 'Inicio', fastEnd: 'Fin',
    displayMode: 'Modo', textMode: 'Texto',
    textModeDesc: 'Discreto, esquinas', timelineMode: 'Barra',
    timelineModeDesc: 'Progreso del día', custom: 'Personalizado',
    customDesc: 'Tus horarios', cancel: 'Cancelar', save: 'Guardar',
    language: 'Idioma', fasting: 'AYUNO', eating: 'COMIDA', restDay: 'DESCANSO',
    timeFormat: 'Formato', h24: '24h', h12: '12h (AM/PM)',
    preset_14_10_name: '14:10 — Principiante', preset_14_10_desc: '14h ayuno · 10h comida',
    preset_16_8_name: '16:8 — Clásico', preset_16_8_desc: '16h ayuno · 8h comida',
    preset_18_6_name: '18:6 — Intermedio', preset_18_6_desc: '18h ayuno · 6h comida',
    preset_20_4_name: '20:4 — Avanzado', preset_20_4_desc: '20h ayuno · 4h comida',
    preset_23_1_name: 'OMAD — Una comida', preset_23_1_desc: '23h ayuno · 1 comida',
    preset_5_2_name: '5:2 — 2 días', preset_5_2_desc: '5d comer · 2d ayuno',
    preset_5_2_week_name: '5:2 — 2 días', preset_5_2_week_desc: '5d comer · 2d ayuno',
    preset_adf_name: 'ADF — Alterno', preset_adf_desc: 'Ayuno cada dos días',
  },
  zh: {
    appTitle: '间歇性断食', fastingType: '断食类型',
    schedule: '时间', fastStart: '开始断食', fastEnd: '结束断食',
    displayMode: '显示模式', textMode: '文字模式',
    textModeDesc: '角落显示', timelineMode: '时间线',
    timelineModeDesc: '进度条', custom: '自定义',
    customDesc: '自定义时间', cancel: '取消', save: '保存',
    language: '语言', fasting: '断食中', eating: '进食中', restDay: '休息日',
    timeFormat: '时间格式', h24: '24小时', h12: '12小时',
    preset_14_10_name: '14:10 — 入门', preset_14_10_desc: '14h断食 · 10h进食',
    preset_16_8_name: '16:8 — 经典', preset_16_8_desc: '16h断食 · 8h进食',
    preset_18_6_name: '18:6 — 中级', preset_18_6_desc: '18h断食 · 6h进食',
    preset_20_4_name: '20:4 — 高级', preset_20_4_desc: '20h断食 · 4h进食',
    preset_23_1_name: 'OMAD — 一餐', preset_23_1_desc: '23h断食 · 1餐',
    preset_5_2_name: '5:2 — 两天', preset_5_2_desc: '5天进食 · 2天断食',
    preset_5_2_week_name: '5:2 — 两天', preset_5_2_week_desc: '5天进食 · 2天断食',
    preset_adf_name: 'ADF — 隔日', preset_adf_desc: '隔日断食',
  },
  ja: {
    appTitle: 'Intermittent Fasting', fastingType: '断食タイプ',
    schedule: 'スケジュール', fastStart: '断食開始', fastEnd: '断食終了',
    displayMode: '表示モード', textMode: 'テキスト',
    textModeDesc: '控えめ表示', timelineMode: 'タイムライン',
    timelineModeDesc: '進捗バー', custom: 'カスタム',
    customDesc: '自由設定', cancel: 'キャンセル', save: '保存',
    language: '言語', fasting: '断食中', eating: '食事中', restDay: '休息日',
    timeFormat: '時間形式', h24: '24時間', h12: '12時間',
    preset_14_10_name: '14:10 — 初心者', preset_14_10_desc: '14h断食 · 10h食事',
    preset_16_8_name: '16:8 — 標準', preset_16_8_desc: '16h断食 · 8h食事',
    preset_18_6_name: '18:6 — 中級', preset_18_6_desc: '18h断食 · 6h食事',
    preset_20_4_name: '20:4 — 上級', preset_20_4_desc: '20h断食 · 4h食事',
    preset_23_1_name: 'OMAD — 一食', preset_23_1_desc: '23h断食 · 1食',
    preset_5_2_name: '5:2 — 二日', preset_5_2_desc: '5日食事 · 2日断食',
    preset_5_2_week_name: '5:2 — 二日', preset_5_2_week_desc: '5日食事 · 2日断食',
    preset_adf_name: 'ADF — 隔日', preset_adf_desc: '隔日断食',
  },
  ko: {
    appTitle: 'Intermittent Fasting', fastingType: '단식 유형',
    schedule: '시간', fastStart: '단식 시작', fastEnd: '단식 종료',
    displayMode: '표시 모드', textMode: '텍스트',
    textModeDesc: '모서리 표시', timelineMode: '타임라인',
    timelineModeDesc: '진행 바', custom: '사용자 정의',
    customDesc: '직접 설정', cancel: '취소', save: '저장',
    language: '언어', fasting: '단식 중', eating: '식사 중', restDay: '휴식일',
    timeFormat: '시간 형식', h24: '24시간', h12: '12시간',
    preset_14_10_name: '14:10 — 입문', preset_14_10_desc: '14h 단식 · 10h 식사',
    preset_16_8_name: '16:8 — 기본', preset_16_8_desc: '16h 단식 · 8h 식사',
    preset_18_6_name: '18:6 — 중급', preset_18_6_desc: '18h 단식 · 6h 식사',
    preset_20_4_name: '20:4 — 고급', preset_20_4_desc: '20h 단식 · 4h 식사',
    preset_23_1_name: 'OMAD — 한 끼', preset_23_1_desc: '23h 단식 · 1끼',
    preset_5_2_name: '5:2 — 이틀', preset_5_2_desc: '5일 식사 · 2일 단식',
    preset_5_2_week_name: '5:2 — 이틀', preset_5_2_week_desc: '5일 식사 · 2일 단식',
    preset_adf_name: 'ADF — 격일', preset_adf_desc: '하루 걸러 단식',
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

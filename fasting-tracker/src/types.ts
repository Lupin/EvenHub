export type DisplayMode = 'text' | 'timeline'

export type FastingPresetId =
  | '16:8'
  | '18:6'
  | '20:4'
  | '23:1'
  | '14:10'
  | '5:2-week'
  | 'adf'
  | 'custom'

export type Language = 'en' | 'fr'

export interface FastingPreset {
  id: FastingPresetId
  name: string
  desc: string
  fastStart: string
  fastEnd: string
  activeDays?: number[]
  /** If true, fasts full 24h days (entire day = fasting zone on fasting days) */
  fullDay?: boolean
  color: string
}

export interface FastingWindow {
  fastStart: string
  fastEnd: string
}

export interface FastingConfig {
  presetId: FastingPresetId
  schedule: FastingWindow
  displayMode: DisplayMode
  lang: Language
  timeFormat: '24h' | '12h'
  bgColor: number
  textColor: number
}

export interface FastingState {
  isFasting: boolean
  presetName: string
  remainingSeconds: number
  dayProgress: number
  windowProgress: number
  nextTransitionIn: number
}

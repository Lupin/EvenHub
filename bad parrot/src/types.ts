import type { Phrase } from './data'

export type NavigationLevel = 0 | 1 | 2 | 3

export interface AppState {
  level: NavigationLevel
  currentCategory: number
  currentPhrase: number
}

export const ANCHOR_Y = 20
export const MAX_ASCII_CHARS = 45
export const MAX_FULLWIDTH_CHARS = 22

export function condense(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text
  return text.substring(0, maxChars - 1) + '…'
}

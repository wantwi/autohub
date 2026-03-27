import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/** @typedef {'light' | 'dark'} ThemeId */

export const THEME_IDS = /** @type {const} */ (['light', 'dark'])

/** @param {unknown} v */
export function isThemeId(v) {
  return typeof v === 'string' && THEME_IDS.includes(/** @type {ThemeId} */ (v))
}

/** @param {unknown} v */
export function normalizeTheme(v) {
  return v === 'dark' ? 'dark' : 'light'
}

export const useThemeStore = create(
  persist(
    (set) => ({
      /** @type {ThemeId} */
      theme: 'light',
      /** @param {ThemeId} theme */
      setTheme: (theme) => set({ theme: normalizeTheme(theme) }),
    }),
    {
      name: 'autohub-theme',
      version: 2,
      migrate: (persistedState) => {
        const next = persistedState && typeof persistedState === 'object' ? persistedState : {}
        return {
          ...next,
          theme: normalizeTheme(next.theme),
        }
      },
    },
  ),
)

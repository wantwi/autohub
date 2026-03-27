import { useLayoutEffect } from 'react'
import { useThemeStore, normalizeTheme } from '@/stores/themeStore'

export function ThemeSync() {
  const theme = useThemeStore((s) => s.theme)

  useLayoutEffect(() => {
    const t = normalizeTheme(theme)
    document.documentElement.dataset.theme = t
    document.documentElement.classList.toggle('dark', t === 'dark')
  }, [theme])

  return null
}

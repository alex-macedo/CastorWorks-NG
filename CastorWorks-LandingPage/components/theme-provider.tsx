"use client"

import * as React from "react"

type Theme = "light" | "dark"

interface ThemeContextValue {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

const ThemeContext = React.createContext<ThemeContextValue | undefined>(undefined)

export function ThemeProvider({
  children,
  defaultTheme = "light",
}: {
  children: React.ReactNode
  defaultTheme?: Theme
  attribute?: string
  enableSystem?: boolean
  disableTransitionOnChange?: boolean
}) {
  const [theme, setThemeState] = React.useState<Theme>(defaultTheme)
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
    const stored = localStorage.getItem("castorworks-theme") as Theme | null
    if (stored === "light" || stored === "dark") {
      setThemeState(stored)
      document.documentElement.classList.toggle("dark", stored === "dark")
    } else {
      document.documentElement.classList.toggle("dark", defaultTheme === "dark")
    }
  }, [defaultTheme])

  const setTheme = React.useCallback((newTheme: Theme) => {
    setThemeState(newTheme)
    localStorage.setItem("castorworks-theme", newTheme)
    document.documentElement.classList.toggle("dark", newTheme === "dark")
  }, [])

  const toggleTheme = React.useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark")
  }, [theme, setTheme])

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = React.useContext(ThemeContext)
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }
  return context
}

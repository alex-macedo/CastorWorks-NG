---
status: awaiting_human_verify
trigger: "theme-dark-mode-global - CastorWorks-NG light/dark mode not working like legacy; sidebar should be black, header standard colors (black/green/blue), cards non-plain-white"
created: "2025-03-01T00:00:00.000Z"
updated: "2025-03-01T00:00:00.000Z"
---

## Current Focus

hypothesis: NG defaults to "system" so light OS = light mode (white cards, light header). Sidebar/header/card variables are correct in index.css but only apply when .dark is set.
test: Set defaultTheme to "dark" and ensure sidebar uses rgb() so Tailwind v4 applies it.
expecting: App loads in dark mode like legacy; sidebar black, header and cards themed.
next_action: Apply defaultTheme="dark", then verify sidebar/card/header.

## Symptoms

expected: Sidebar black/dark; page header uses black, green, blue; cards use same non-plain-white backgrounds as legacy.
actual: Sidebar white/light; header not using standard colors; all cards plain white.
errors: None reported.
reproduction: Open CastorWorks-NG dashboard; compare to legacy. Sidebar, top header, main content cards should match legacy dark/themed appearance.
started: Worked in legacy CastorWorks; current state in CastorWorks-NG.

## Eliminated

(none yet)

## Evidence

- ThemeProvider uses defaultTheme="system" → light OS shows light mode (index.css :root = light, .dark = dark).
- index.css :root has --sidebar: 28 36 51 (dark) and --card: 246 248 254 (light). .dark has --card: 49 58 70.
- Sidebar uses bg-sidebar; TopBar has no brand bar; SidebarHeaderShell has default dark = black gradient.
- Tailwind v4 @theme inline sets --color-sidebar: var(--sidebar). If utilities use this without rgb(), background could be invalid; tailwind.config has sidebar: "rgb(var(--sidebar))" but v4 may prefer @theme.
- Legacy matched dark-by-default; NG with system defaults to light when OS is light → cards/header/sidebar appear light/white.

## Resolution

root_cause: (1) defaultTheme was "system", so on light OS the app loaded in light mode (white/light sidebar, light cards, light header). (2) Sidebar background relied on Tailwind bg-sidebar; a guaranteed rule for [data-sidebar="sidebar"] ensures the dark sidebar color always applies.
fix: Set ThemeProvider defaultTheme to "dark" so NG loads in dark mode like legacy. Added explicit [data-sidebar="sidebar"] rule in index.css to set background-color and color from CSS variables so the sidebar is always dark regardless of Tailwind utility resolution.
verification: Build passes. User should confirm: open CastorWorks-NG dashboard — sidebar black/dark, page header (dashboard banner) uses dark/black gradient, cards use dark card background (not plain white). Theme toggle in TopBar still allows switching to light.
files_changed: [src/components/ThemeProvider.tsx, src/index.css]

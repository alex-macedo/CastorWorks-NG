# Fix: Sidebar Collapsing to 0px Width (Tailwind v4 CSS Variable Breaking Change)

**Date:** 2026-03-01  
**Affected file:** `src/components/ui/sidebar.tsx`  
**Root cause:** Tailwind CSS v4 breaking change in arbitrary value syntax for CSS variables

---

## Symptom

The main sidebar appears completely collapsed — its spacer element renders at `0px` wide, causing the `SidebarInset` (main content area) to start at `x: 0` and visually overlap the fixed sidebar panel. On desktop the sidebar icon/rail area is invisible or the content area covers it entirely.

In the browser the sidebar toggle button may still work (opening/closing a Sheet overlay on mobile) but the desktop layout spacer never pushes content to the right.

---

## Root Cause

Shadcn/ui's `sidebar.tsx` component uses Tailwind **arbitrary value** classes to apply CSS variable widths to the spacer and panel elements:

```html
<!-- Before fix (broken under Tailwind v4) -->
<div class="w-[--sidebar-width]">...</div>
<div class="w-[--sidebar-width-icon]">...</div>
```

**Tailwind CSS v3** treated `w-[--sidebar-width]` as a CSS variable reference and generated:

```css
.w-\[--sidebar-width\] { width: var(--sidebar-width); }
```

**Tailwind CSS v4** changed the arbitrary value syntax. Bare CSS variable names without the `var()` wrapper now generate **invalid CSS**:

```css
/* Tailwind v4 output — INVALID, browser ignores it */
.w-\[--sidebar-width\] { width: --sidebar-width; }
```

Because `width: --sidebar-width` is not valid CSS, the browser ignores the rule entirely and the element defaults to `width: 0` (or `auto` in a flex context), making the spacer invisible.

The CSS variable `--sidebar-width` itself was set correctly (verified at `256px` on the sidebar's outer `div`), so the problem was purely in how the generated utility class referenced it.

---

## Diagnosis Steps

1. **Visual symptom:** Content area starts at `x: 0` on desktop; sidebar panel overlaps content.
2. **Runtime probe** (via `getBoundingClientRect()` on the spacer element): `spacerComputedWidth: "0px"` despite the CSS variable being set.
3. **Build output inspection** (`dist/assets/index-*.css`): confirmed the generated CSS contained `width: --sidebar-width` (no `var()` wrapper).
4. **Conclusion:** Tailwind v4 changed how bare CSS variable names in arbitrary values are output.

---

## Fix

In `src/components/ui/sidebar.tsx`, replace all bare CSS variable arbitrary values with the explicit `var()` wrapper.

**Search for:** `w-[--sidebar-width]` and `w-[--sidebar-width-icon]`  
**Replace with:** `w-[var(--sidebar-width)]` and `w-[var(--sidebar-width-icon)]`

There were **6 occurrences** in total:

| Class (before) | Class (after) |
|---|---|
| `w-[--sidebar-width]` | `w-[var(--sidebar-width)]` |
| `w-[--sidebar-width-icon]` | `w-[var(--sidebar-width-icon)]` |

Example diff:

```tsx
// Before
<div className={cn("flex h-full w-[--sidebar-width] flex-col bg-sidebar text-sidebar-foreground", className)}>

// After
<div className={cn("flex h-full w-[var(--sidebar-width)] flex-col bg-sidebar text-sidebar-foreground", className)}>
```

After the fix, `spacerComputedWidth` resolved to `"256px"` and `SidebarInset` started at `x: 256` as expected.

---

## General Rule for Tailwind v4

Whenever you use a CSS custom property inside a Tailwind arbitrary value, **always use the `var()` wrapper explicitly**:

```html
<!-- ✅ Correct in Tailwind v4 -->
<div class="w-[var(--my-width)]">
<div class="h-[var(--my-height)]">
<div class="bg-[var(--my-color)]">

<!-- ❌ Broken in Tailwind v4 (worked in v3) -->
<div class="w-[--my-width]">
<div class="h-[--my-height]">
<div class="bg-[--my-color]">
```

This affects **any** Tailwind utility that uses an arbitrary CSS variable value — not just `width`.

---

## Related Issues in This Codebase

The same Tailwind v4 migration also required:

- **`src/index.css`**: `@theme inline { ... }` must be placed **before** `@import "tailwindcss"` for theme utilities (`bg-card`, `text-foreground`, etc.) to be generated correctly.
- **`vite.config.ts`**: Must use `@tailwindcss/vite` plugin (not `@tailwindcss/postcss`) as the Tailwind integration for Vite projects. Both running simultaneously causes double-processing and broken output.
- **`postcss.config.js`**: Remove `'@tailwindcss/postcss': {}` when using the Vite plugin to avoid conflicts.
- **`src/index.css`**: No duplicate `@theme inline` blocks — remove any that appear below the first one.

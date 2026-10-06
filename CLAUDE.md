# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**Pulso** is an installable web app (PWA) for building healthy habits: movement, food, rest and health tracking.

- Product spec (source of truth): `/Users/nicolasdelcastillo/Documents/web/proyectos/pulso/PULSO-SPEC.md`. Work phase by phase following its roadmap (section 7); never start the next phase without being asked.
- Visual system: **read `DESIGN.md` before building any UI.** It is a strict black / white / orange editorial system: big regular-weight numbers, small text, rounded blocks separated by air (never divider lines), dark mode by default, orange only for state. `inspo/` is reference material only (gitignored) — never import from it.
- Component references per phase are mapped in `DESIGN.md` → "Componentes por fase". **Licensing is strict:** `inspo/gauge-ui-main` is MIT (porting code is fine, with an attribution comment); `inspo/openGym-main` is **AGPL-3.0 — visual and UX reference only (Pulso copies its look), never copy or translate its code** (CSS or JS), not even rewritten from React to vanilla.
- The owner is a web designer who wants to understand all the code: keep it clear, comment in Spanish where it helps, no over-engineering. UI copy is Spanish (es-AR).

## Running the Project

No build, no package.json, no npm dependencies. Serve the root with any static server (ES modules don't work over `file://`):

```bash
npx serve . -l 4173
```

Then open `http://localhost:4173`. Press `g` to toggle the layout grid overlay.

Logic tests (pure functions in `src/utils/`) use Node's built-in runner, no dependencies. Always pass the glob — a bare `node --test` would also pick up the test files inside `inspo/`:

```bash
node --test 'tests/**/*.test.js'
```

Anything that computes domain state (streaks, progress, scores, sleep hours, dates) is a pure function in `src/utils/` with a test in `tests/`. Write the test first.

## Architecture

Vanilla HTML, CSS and JS (ES modules). GSAP 3.14.1 + ScrollTrigger + SplitText via CDN are the only external scripts.

```
index.html              app shell: header, <main id="view">, bottom nav (static markup)
DESIGN.md               design system: tokens, roles, components, do/don't
src/
├── main.js             entry: theme → header → router
├── router.js           hash router (#/hoy … #/perfil, #/perfil/habitos)
├── store/
│   ├── store.js        THE data API: get, set, subscribe + add/update/remove for collections — all async
│   ├── local.js        localStorage adapter (the only file that touches localStorage)
│   ├── defaults.js     initial value per key + suggested habits
│   ├── seed.js         first run: saves the suggested habits
│   ├── habits.js       habit reads/writes (context loader, logs, water, save/archive/reorder)
│   ├── rest.js         sleep (one per day), mood check-in, breathing → pause habit
│   ├── health.js       lab results, body weight/waist, lab reference ranges
│   └── backup.js       JSON export / import
├── views/<view>/       one folder per section: <view>.js (+ <view>.css if needed)
├── components/<name>/  functions that return HTML strings (+ co-located CSS)
├── layout/             app-shell, header, bottom-nav (Hoy as raised center button), grid
├── animation/          GSAP reveals, applied per view by the router
├── utils/              pure logic (dates, habits, streaks, workouts, meals, sleep, progress, health) + html escaping, icons, theme
├── content/            static copy with sources (science recommendations)
├── styles/             tokens → semantic → base → variants
└── assets/             icons, images, fonts
tests/                  node:test files for src/utils
```

### Habits and `source`

A habit's value either comes from its own `habit_log` (manual) or from another pillar via `habit.source`: `workout_minutes`, `water`, `meal_veggies`, `sleep`, `breathing`. Each piece of data is entered in exactly one place; Hoy derives the rest. See `src/utils/habits.js`. Dates are local `"YYYY-MM-DD"` keys (`utils/dates.js`), never `toISOString()`.

### Data rule (critical for the Supabase migration)

**No view, component or layout file touches `localStorage` (or any storage) directly.** Everything goes through `src/store/store.js`. Later `local.js` is swapped for `supabase.js` with the same `read / write / remove` signature. Store keys are the entity names from spec section 6 (`profile`, `habit`, `habit_log`, `workout`, …).

### Views

Each view exports `title` (string), optionally `subtitle` (string shown under the big header title; without one the header shows today's date — the five sections use the date, Perfil and Hábitos their own subtitle), `render(root)` (may be async) and optionally `back` (hash for the header back arrow, used by sub-routes like `perfil/habitos`). To re-render the current view from anywhere (after an import, at midnight): `window.dispatchEvent(new Event("pulso:refresh"))`. Lists that update often (Hoy) update cards in place instead of re-rendering, so focus and CSS transitions survive. If `render` returns a function, the router calls it when leaving the view (unsubscribe from the store, stop timers). The router renders into a fresh `.view.container` element, then runs GSAP reveals inside a `gsap.context` that is reverted on leave — views never init or clean up animations themselves. Animation classes: `src/animation/animation-classes.md`.

### Components

Plain functions that return HTML strings. **Every user-provided value goes through `escapeHTML()`** (`src/utils/html.js`) before entering a template. Event listeners are attached by the view after inserting the HTML.

### CSS

`src/styles.css` is the single CSS entry; register every new CSS file there under its group (tokens, semantic, base, variants, layout, animations, components, views). Every new JS module is imported from where it's used (views from `router.js`).

- Views and components use **semantic aliases only** (`--color-text`, `--color-border`, `--card-padding`…), never raw color tokens — otherwise they ignore the theme.
- Theme: `light-dark()` aliases + `color-scheme`. No `data-theme` = follow the OS; `data-theme="light|dark"` forces it (on `<html>` or any element). See `DESIGN.md`.

### Units

1. **Use an existing token** if one fits — e.g. `var(--spacing-xl)`, `var(--font-2xl-size)`.
2. **Otherwise plain fixed `px`.**

Never `clamp()`, `vw`, `rem`/`em` or other fluid units for sizing. Exceptions: `vh`/`dvh` for heights, `%` for widths relative to a container, `env(safe-area-inset-*)` for device safe areas.

### Responsive — MOBILE FIRST

Base styles are mobile (375px is the source of truth). Add behavior with `min-width` only, ascending, always at the end of each CSS file, after this exact banner:

```css
/* ============================================
RESPONSIVE
============================================ */
```

```css
@media (min-width: 480px)  { }   /* Large Mobile */
@media (min-width: 640px)  { }   /* Phablet */
@media (min-width: 768px)  { }   /* Tablet */
@media (min-width: 1024px) { }   /* Laptop — bottom nav becomes side rail */
@media (min-width: 1280px) { }   /* Desktop */
@media (min-width: 1400px) { }   /* Large Desktop */
```

Never use `max-width` media queries.

### File Headers (CSS & JS)

Every CSS and JS file starts with this exact 3-line banner — group and name, separated by an em dash:

```css
/* ============================================
   Views — Hoy
   ============================================ */
```

Groups: `Tokens`, `Semantic`, `Base`, `Variants`, `Layout`, `Animation`, `Components`, `Views`, `Store`, `Utils`, `App`. Versions add a suffix: `Components — Habit Card V2`.

### Versions

Alternative versions of a component or view go in the same folder as `<name>--vN.css|js` (never named by what they do), and their markup starts with `<!-- SECTION: Name--vN -->`.

### Accessibility baseline

Tap targets ≥ 44px (`--size-tap`), visible focus (`:focus-visible` uses `--color-focus`), icons next to text get `aria-hidden="true"`, the router moves focus to the header `h1` on navigation, status is never shown by color alone.

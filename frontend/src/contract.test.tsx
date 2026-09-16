import { describe, it, expect } from 'vitest'

/**
 * Every module in this app must be importable.
 *
 * Deliberately shallow: it imports, it does not render. A module-level mistake --
 * an identifier that was never defined, a renamed export a caller still uses, a
 * bad relative path, malformed JSX -- throws here. In the browser the same
 * mistake takes the whole app down, because the entry pulls these in.
 *
 * `npm run build` does NOT catch these: Vite only compiles what the entry
 * actually reaches, so anything unreferenced or lazily imported can be broken
 * for months and still build clean. This checks what is on disk.
 *
 * It earns its place. On a sibling program this found a component using a bare
 * `SITE` after its import had been renamed to SITE_URL -- every page rendering
 * it threw, and only a stale deployed bundle hid it. On another it found four
 * files that could not be imported at all.
 */
const modules = import.meta.glob('./{pages,components,hooks}/**/*.{js,jsx,ts,tsx}')

/**
 * Modules that cannot be IMPORTED in this environment, with the reason.
 *
 * Not "known broken" -- these are fine in a browser. react-konva pulls in
 * konva, whose Node build requires the native `canvas` package, and jsdom
 * cannot stand in for that. Aliasing konva to its browser build and inlining
 * the dependency both fail, because react-konva resolves konva through its own
 * CommonJS require.
 *
 * Kept as an explicit list rather than a pattern so it cannot quietly grow, and
 * asserted below to still match something, so it cannot rot into a lie.
 */
const REQUIRES_REAL_CANVAS = [
  './components/ScreenshotAnnotator.tsx',
  './pages/JobDetail.tsx',
]

const all = Object.entries(modules).filter(([p]) => !p.includes('.test.') && !p.includes('.spec.'))
const entries = all.filter(([p]) => !REQUIRES_REAL_CANVAS.includes(p))

describe('the frontend contract', () => {
  it('found modules to check', () => {
    expect(entries.length).toBeGreaterThan(3)
  })

  it('every exclusion still refers to a real module', () => {
    // If a file is renamed or deleted, the exclusion above becomes a silent
    // hole that skips nothing and hides the next module of the same name.
    const present = all.map(([p]) => p)
    for (const skipped of REQUIRES_REAL_CANVAS) {
      expect(present).toContain(skipped)
    }
  })

  it.each(entries)('%s imports without throwing', async (_path, load) => {
    await expect(load()).resolves.toBeDefined()
  })
})

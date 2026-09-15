import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // jsdom IS a browser environment, so packages must resolve their browser
  // builds. Without this, react-konva loads index-node.js and demands the native
  // `canvas` package, and CJS-only modules arrive unconverted ("exports is not
  // defined") -- both artefacts of resolving as Node, neither a defect in the app.
  resolve: {
    conditions: ['browser'],
    // konva declares main: lib/index-node.js and browser: lib/index.js as a
    // legacy top-level field, which `conditions` does not cover -- so it loaded
    // the Node build and demanded the native `canvas` package. Pointed at the
    // build a browser would get, which is what jsdom is standing in for.
    alias: { konva: 'konva/lib/index.js' },
  },
  test: {
    server: { deps: { inline: [/konva/, /react-konva/, /rrweb/] } },
    globals: true,
    environment: 'jsdom',
    // Source tests only. Vitest's default include matches *.spec.* anywhere,
    // which collects Playwright specs under e2e/ or tests/ and fails on every
    // one with "Playwright Test did not expect test.describe() to be called
    // here" -- a runner mismatch, not a failing test. Playwright owns those.
    include: ['src/**/*.{test,spec}.{js,jsx,ts,tsx}'],
  },
})

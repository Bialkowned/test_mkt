import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

// The fleet's single eslint standard: eslint 9 with a flat config. There is one
// format on purpose -- eslint 9 dropped .eslintrc support and eslint 8 is
// end-of-life, so a program left on the legacy pair cannot be upgraded without
// this change anyway, and two formats means two places to keep a rule.
// eslint-plugin-react-hooks is pinned to ~7.0.1 on purpose, not loosely: 7.1.1
// makes any state-setting call inside an effect an error, including a plain
// fetch-on-mount, which no program on this fleet satisfies today.
//
// THE GLOB COVERS js,jsx AS WELL AS ts,tsx, unlike the fully-converted reference
// (snarkie, nodeharborpro). This program is NOT fully converted and still holds
// .js source outside node_modules. Narrowing to ts,tsx would drop those from lint
// entirely and the run would still exit 0 -- the same silent coverage loss the
// .jsx->.tsx rename caused here, only in reverse. Count the files, not the exit code.
export default defineConfig([
  // THE IGNORES ARE RECURSIVE ON PURPOSE. A bare 'dist' is anchored to this config's
  // directory, so it misses web/build and mobile/dist in a multi-app frontend. The
  // non-recursive form read 134 files here and reported 1,457 errors, 1,249 of them
  // inside web/build/assets/index-*.js -- a minified bundle, not source. Both the
  // fleet's output names are listed because vite and the postbuild scripts have
  // disagreed about which one is real.
  globalIgnores([
    '**/dist/**', '**/build/**', '**/coverage/**',
    '**/playwright-report/**', '**/test-results/**',
    '**/node_modules/**', '**/*.min.js',
  ]),
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // THE UNDERSCORE PREFIX IS THIS CODEBASE'S OWN "intentionally unused" MARKER and
      // it is already used deliberately -- _job, _error, _insurance, _token, _isOnline.
      // tseslint's recommended set does not honour it, so every one of those reads as a
      // finding. Honouring the convention is not widening the rule: a name the author
      // marked unused on purpose is not the same as one left behind by accident, and
      // conflating them buries the accidental ones.
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],
    },
  },
  {
    // NODE CODE LINTED AS BROWSER CODE REPORTS `process` AS UNDEFINED. Build scripts,
    // the prerender pass, the static server and the Playwright suites all run under
    // node, never in a page. Without this block `no-undef` fires on process, __dirname,
    // require and module -- findings that describe the config, not the code.
    files: [
      '**/scripts/**/*.{js,ts}', '**/tests/**/*.{js,ts}', '**/*.config.{js,ts}',
      '**/server.{js,ts}', '**/prerender.{js,ts}', '**/*.spec.{js,ts}',
    ],
    languageOptions: {
      globals: { ...globals.node, ...globals.browser },
      sourceType: 'commonjs',
    },
    rules: {
      // THESE DIRECTORIES ARE GENUINELY CommonJS: neither web/package.json nor
      // tests/package.json declares "type":"module", so node loads them as CJS and
      // require() is the correct call there. Reporting it would be asking working
      // files to adopt a module system their own package.json does not select --
      // and rewriting them to import would break them at runtime.
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  {
    // REACT NATIVE IS NOT A BROWSER AND NOT NODE. A mobile app linted as browser code
    // reports jest, __DEV__, global, process, require and module as undefined -- 82
    // findings here, every one describing the config rather than the code. The glob
    // matches nothing in a program with no mobile app, so this block is inert there
    // rather than being a second config somebody has to keep in sync.
    files: ['**/mobile/**/*.{js,jsx,ts,tsx}', '**/mobile-app/**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      globals: { ...globals.node, ...globals.jest, __DEV__: 'readonly' },
    },
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
])

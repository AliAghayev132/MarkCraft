import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'
import globals from 'globals'

/**
 * The architecture rules that matter are enforced here rather than left to
 * review: the renderer may not import Electron or Node, and only the service
 * layer may touch the preload bridge. Without these, §49's separation is a
 * convention that erodes on the first deadline.
 */
const VENDOR =
  'Third-party packages are imported through @lib/* only. Add or reuse a re-export there — see src/renderer/lib/README.md.'

export default tseslint.config(
  { ignores: ['out/**', 'dist/**', 'release/**', 'node_modules/**', 'coverage/**'] },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  /* ── Shared defaults ───────────────────────────────────────────────────── */
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } }
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' }
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' }
      ],
      eqeqeq: ['error', 'smart'],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'prefer-const': 'error',
      'object-shorthand': 'error'
    }
  },

  /* ── Main process ──────────────────────────────────────────────────────── */
  {
    files: ['src/main/**/*.ts', 'src/preload/**/*.ts'],
    languageOptions: { globals: { ...globals.node } },
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@renderer/*', '**/renderer/**'],
              message:
                'The main process must not import renderer code. Share types through src/shared instead.'
            }
          ]
        }
      ]
    }
  },

  /* ── Renderer ──────────────────────────────────────────────────────────── */
  {
    files: ['src/renderer/**/*.{ts,tsx}'],
    languageOptions: { globals: { ...globals.browser } },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,

      /*
       * These three are React Compiler-era rules. They flag patterns that are
       * genuinely required when driving imperative editors (CodeMirror,
       * ProseMirror) and when measuring the DOM to position an overlay before
       * paint. Kept as warnings so new occurrences stay visible and get a
       * second look, rather than switched off and forgotten.
       */
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/immutability': 'warn',

      'no-restricted-imports': [
        'error',
        {
          // Bare module names go in `paths`, not `patterns`: pattern groups use
          // gitignore semantics, where "path" would also match
          // "@shared/utils/path".
          paths: [
            {
              name: 'electron',
              message:
                'The renderer is sandboxed and has no Electron access. Go through window.api via renderer/services.'
            },
            { name: 'fs', message: 'The renderer has no Node access by design.' },
            {
              name: 'path',
              message: 'Use the pure path helpers in @shared/utils/path instead.'
            },
            { name: 'os', message: 'The renderer has no Node access by design.' },
            { name: 'child_process', message: 'The renderer has no Node access by design.' },

            /*
             * The vendor boundary. Third-party packages are reached through
             *  only, so an upgrade is absorbed in one module rather
             * than rippling through the feature code. See lib/README.md.
             */
            { name: 'react', message: VENDOR },
            { name: 'react-dom', message: VENDOR },
            { name: 'react-dom/client', message: VENDOR },
            { name: '@reduxjs/toolkit', message: VENDOR },
            { name: 'react-redux', message: VENDOR },
            { name: 'lucide-react', message: VENDOR },
            { name: 'unified', message: VENDOR },
            { name: 'lowlight', message: VENDOR }
          ],
          patterns: [
            {
              group: ['node:*'],
              message:
                'The renderer has no Node access by design. Use renderer/services, or the path helpers in @shared/utils/path.'
            },
            {
              group: ['@main/*'],
              message: 'The renderer must not import main-process code. Use src/shared.'
            },
            { group: ['@codemirror/*', '@lezer/*'], message: VENDOR },
            { group: ['@tiptap/*'], message: VENDOR },
            { group: ['remark-*', 'rehype-*', 'hast-util-*', 'mdast-util-*', 'unist-util-*'], message: VENDOR },
            { group: ['highlight.js/**'], message: VENDOR }
          ]
        }
      ],

      /*
       * The preload bridge is reachable from exactly one layer. This is what
       * keeps IPC calls from being scattered through components (§42, §53).
       */
      'no-restricted-syntax': [
        'error',
        {
          selector: "MemberExpression[object.name='window'][property.name='api']",
          message:
            'window.api may only be used inside renderer/services. Add or reuse a service function instead.'
        }
      ]
    }
  },

  /* The vendor layer is where third-party packages may be named. */
  {
    files: ['src/renderer/lib/**/*.{ts,tsx}'],
    rules: { 'no-restricted-imports': 'off' }
  },

  /* The service layer is the one place allowed to use the bridge. */
  {
    files: ['src/renderer/services/**/*.ts'],
    rules: { 'no-restricted-syntax': 'off' }
  },

  /* ── Shared ────────────────────────────────────────────────────────────── */
  {
    files: ['src/shared/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'electron', message: 'Shared code runs in every process; keep it pure.' },
            { name: 'fs', message: 'Shared code must not depend on Node.' },
            { name: 'path', message: 'Shared code must not depend on Node.' }
          ],
          patterns: [
            {
              group: ['node:*', '@main/*', '@renderer/*'],
              message:
                'Shared code is imported by the sandboxed renderer, so it must not depend on Node or on either process.'
            }
          ]
        }
      ]
    }
  },

  /* ── Tests and tooling ─────────────────────────────────────────────────── */
  {
    files: ['tests/**/*.ts', '*.config.ts', 'eslint.config.mjs'],
    languageOptions: { globals: { ...globals.node } },
    rules: {
      'no-restricted-imports': 'off',
      'no-restricted-syntax': 'off',
      'no-console': 'off'
    }
  }
)

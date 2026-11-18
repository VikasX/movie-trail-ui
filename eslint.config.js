/**
 * Lint rules that catch common JavaScript, TypeScript, and React-hook mistakes.
 * Generated files are excluded. Node scripts and browser source receive appropriate environment globals.
 * The Prettier compatibility configuration avoids conflicting formatting rules.
 *
 * See docs/FRONTEND_GUIDE.md for the plain-language walkthrough.
 */
// Bring in the exported helpers/components from `@eslint/js`.
import js from '@eslint/js'
// Bring in the exported helpers/components from `globals`.
import globals from 'globals'
// Bring in the exported helpers/components from `eslint-plugin-react-hooks`.
import reactHooks from 'eslint-plugin-react-hooks'
// Bring in the exported helpers/components from `eslint-plugin-react-refresh`.
import reactRefresh from 'eslint-plugin-react-refresh'
// Bring in the exported helpers/components from `typescript-eslint`.
import tseslint from 'typescript-eslint'
// Bring in the exported helpers/components from `eslint-config-prettier`.
import prettier from 'eslint-config-prettier'

export default tseslint.config(
  {
    // Set the `ignores` field to an array containing these ordered values.
    ignores: [
      'dist',
      'node_modules',
      'public/mockServiceWorker.js',
      'src/types/api.generated.ts',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // Set the `files` field to an array containing these ordered values.
    files: ['scripts/*.mjs'],
    // Set the `languageOptions` field to an object whose named fields are explained below.
    languageOptions: { globals: globals.node },
  },
  {
    // Set the `files` field to an array containing these ordered values.
    files: ['**/*.{ts,tsx}'],
    // Set the `languageOptions` field to an object whose named fields are explained below.
    languageOptions: { ecmaVersion: 'latest', globals: globals.browser },
    // The build plugins loaded by this configuration.
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    // Set the `rules` field to an object whose named fields are explained below.
    rules: {
      ...reactHooks.configs.recommended.rules,
      // Set the `'@typescript-eslint/no-unused-vars'` field to an array containing these ordered values.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { ignoreRestSiblings: true },
      ],
      // Set the `'react-refresh/only-export-components'` field to an array containing these ordered values.
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
    },
  },
  prettier,
)

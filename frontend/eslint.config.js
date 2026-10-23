import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
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
      // Flags the fetch-on-mount pattern (useEffect(() => { load() }, [load])) used across pages.
      // Kept visible as a warning until data loading moves to a data-fetching hook.
      'react-hooks/set-state-in-effect': 'warn',
      // Context files export their Provider and its use* hook together on purpose.
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
])

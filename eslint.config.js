import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      // Konfigurasi ini tidak memuat eslint-plugin-react, jadi `no-unused-vars`
      // tidak bisa melihat pemakaian di dalam JSX: `<Foo />` tidak terhitung
      // sebagai pemakaian variabel `Foo`. Penambalnya adalah varsIgnorePattern
      // di bawah — nama komponen selalu diawali huruf besar, jadi semuanya
      // terlewat dari pemeriksaan.
      //
      // `motion` dari framer-motion adalah satu-satunya pengecualian yang
      // dipakai di sini: namanya huruf kecil dan hanya muncul sebagai
      // `<motion.div>`, sehingga dilaporkan "tidak pernah dipakai" di 32
      // berkas — padahal menghapus impornya akan mematikan halamannya.
      'no-unused-vars': [
        'error',
        { varsIgnorePattern: '^([A-Z_]|motion$)', argsIgnorePattern: '^[A-Z_]' },
      ],
    },
  },
])

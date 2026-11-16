import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  root: '.',
  publicDir: false,
  server: {
    port: 8081,
    open: '/demo/',
  },
  resolve: {
    alias: {
      'ace-diff': resolve(import.meta.dirname, 'src/index.ts'),
      'ace-diff/styles': resolve(
        import.meta.dirname,
        'src/styles/ace-diff.scss',
      ),
    },
  },
})

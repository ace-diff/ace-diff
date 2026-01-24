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
      'ace-diff': resolve(__dirname, 'src/index.ts'),
      'ace-diff/styles': resolve(__dirname, 'src/styles/ace-diff.scss'),
    },
  },
})

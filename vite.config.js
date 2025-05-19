import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    sourcemap: true,
    rollupOptions: {
      input: ['./src/index.js', './src/styles/ace-diff.scss', './src/styles/ace-diff-dark.scss'],
      output: {
        entryFileNames: 'ace-diff.min.js',
        assetFileNames: '[name].min[extname]',
      },
      preserveEntrySignatures: 'strict',
    },
  },
  test: {
    publicDir: 'test/fixtures',
    root: 'test/fixtures',
  },
  server: {
    port: 8081,
  },
})

import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  minify: true,
  deps: {
    neverBundle: ['ace-builds'],
    alwaysBundle: ['@sanity/diff-match-patch'],
    onlyBundle: ['@sanity/diff-match-patch'],
  },
  outExtension({ format }) {
    return {
      js: format === 'cjs' ? '.cjs' : '.js',
      dts: format === 'cjs' ? '.d.cts' : '.d.ts',
    }
  },
})

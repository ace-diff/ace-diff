import prettier from "eslint-plugin-prettier";
import globals from "globals";
import js from "@eslint/js";
import { defineConfig } from 'eslint/config'

export default defineConfig([
  {
    files: ['**/*.{js,mjs,cjs,ts,mts,cts}'],
    plugins: {
      js,
      prettier,
    },

    languageOptions: {
      globals: {
        ...globals.node,
      },

      ecmaVersion: 2022,
      sourceType: "module",
    },

    rules: {
      "no-console": "error",
      "no-debugger": "error",

      "prettier/prettier": ["warn", {
        endOfLine: "auto",
      }],
    },
  },
])

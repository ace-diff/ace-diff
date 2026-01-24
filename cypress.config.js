const { defineConfig } = require('cypress')

module.exports = defineConfig({
  e2e: {
    baseUrl: 'http://localhost:8081/test/fixtures',
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
  },
})

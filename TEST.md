# Testing

This project uses [Cypress](https://www.cypress.io/) for end-to-end testing.

## Prerequisites

Make sure dependencies are installed:

```bash
pnpm install
```

## Start the Development Server

Tests require the development server to be running on port 8081. Start it before running any tests:

```bash
pnpm serve
```

Keep this running and use a separate terminal for the test commands below.

## Running Tests

### Headless Mode (CI)

Run all tests in headless mode:

```bash
pnpm test
```

Run a specific test file:

```bash
pnpm test -- --spec "cypress/e2e/themes.cy.js"
```

### Interactive Mode

Open the Cypress Test Runner for interactive debugging:

```bash
pnpm cypress
```

This opens a browser where you can select and run individual tests.

## Test Structure

Tests are located in `cypress/e2e/`:

| Test File | Description |
|-----------|-------------|
| `api.cy.js` | Tests for the AceDiff API methods |
| `basics.cy.js` | Basic initialization and rendering |
| `blank-lines.cy.js` | Handling of blank line diffs and merges |
| `diff-granularity.cy.js` | Broad vs specific diff granularity |
| `issue-93.cy.js` | Regression test for issue #93 |
| `left-to-right.cy.js` | Left-to-right merge operations |
| `merging.cy.js` | General merge functionality |
| `newlines.cy.js` | Handling of different EOL characters |
| `right-to-left.cy.js` | Right-to-left merge operations |
| `themes.cy.js` | Light and dark theme CSS verification |

## Test Fixtures

HTML test fixtures are in `test/fixtures/`. Each fixture sets up an AceDiff instance with specific content for testing. You can view them directly at http://localhost:8081 when the server is running.

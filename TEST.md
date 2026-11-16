# Testing

This project uses [Cypress](https://www.cypress.io/) for end-to-end testing.

## Prerequisites

Make sure dependencies are installed:

```bash
pnpm install
```

## Build First

The test fixtures load the built library from `dist/` (`../../dist/index.mjs` and `../../dist/styles.css`), not the TypeScript source. Build before running tests, and rebuild after every source change:

```bash
pnpm build
```

## Running Tests

### Headless Mode (CI)

Run all tests in headless mode:

```bash
pnpm test
```

This starts the Vite dev server on port 8081, waits for it to be ready, runs Cypress, then shuts the server down. You do not need to start a server yourself.

Run a specific test file:

```bash
pnpm test -- --spec "cypress/e2e/themes.cy.js"
```

### Interactive Mode

Start the dev server in one terminal:

```bash
pnpm dev
```

Then open the Cypress Test Runner in another:

```bash
pnpm cypress:open
```

This opens a browser where you can select and run individual tests.

> **Note:** If the dev server is already running when you rebuild, Vite may keep serving the previous `dist/` build from its cache. Restart it with `pnpm dev --force` after rebuilding.

## Test Structure

Tests are located in `cypress/e2e/`:

| Test File                | Description                                     |
| ------------------------ | ----------------------------------------------- |
| `api.cy.js`              | Tests for the AceDiff API methods               |
| `basics.cy.js`           | Basic initialization and rendering              |
| `blank-lines.cy.js`      | Handling of blank line diffs and merges         |
| `diff-granularity.cy.js` | Broad vs specific diff granularity              |
| `issue-93.cy.js`         | Regression test for issue #93                   |
| `left-to-right.cy.js`    | Left-to-right merge operations                  |
| `line-height.cy.js`      | Gutter redraw once Ace measures the line height |
| `merging.cy.js`          | General merge functionality                     |
| `newlines.cy.js`         | Handling of different EOL characters            |
| `on-diff-ready.cy.js`    | The `onDiffReady` callback                      |
| `right-to-left.cy.js`    | Right-to-left merge operations                  |
| `scroll-unlock.cy.js`    | Independent scrolling with `lockScrolling` off  |
| `themes.cy.js`           | Light and dark theme CSS verification           |
| `trailing-newline.cy.js` | Diffs that differ only by a trailing newline    |

## Test Fixtures

HTML test fixtures are in `test/fixtures/`. Each fixture sets up an AceDiff instance with specific content for testing. With the dev server running, view them at `http://localhost:8081/test/fixtures/<name>.html`.

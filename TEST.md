## Unit testing

The jest tests require adding to the `devDependencies` in `package.json`:

    "@babel/core": "^7.27.3",
    "babel-jest": "^30.0.0-beta.3",
    "jest": "^29.3.1",
    "jest-environment-jsdom": "^29.7.0",
    "@testing-library/jest-dom": "^6.6.3",

as well as adding a babel.config.json file like the following:

    {
      "presets": [
        [
          "@parcel/babel-preset-env",
          {
            "targets": {
              "node": "current"
            }
          }
        ]
      ]
    }

However, once we create that the `parcel` build complains with:

    @parcel/transformer-babel: Parcel includes transpilation by default. Babel config babel.config.json contains only redundant presets. Deleting it may significantly improve build performance.

Since we're not really doing much unit testing with `jest`, the babel.config.json file has been removed and only the cypress tests are run.

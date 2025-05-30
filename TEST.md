## Unit testing

The jest tests require a babel.config.json file like the following:

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

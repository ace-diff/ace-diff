const path = require('path');
const webpack = require('webpack');
const UglifyJsPlugin = require('uglifyjs-webpack-plugin');

module.exports = {
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'ace-diff.min.js',
    library: 'AceDiff',
    libraryTarget: 'umd',
    libraryExport: 'default',
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /(node_modules|bower_components)/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              ['env', { modules: false }],
            ],
          },
        },
      },
    ],
  },
  plugins: [
    new UglifyJsPlugin(),
    new webpack.BannerPlugin('Ace-diff | github.com/ace-diff/ace-diff'),
  ],
};

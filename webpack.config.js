const path = require('path');
const webpack = require('webpack');
const UglifyJsPlugin = require('uglifyjs-webpack-plugin');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const autoprefixer = require('autoprefixer');

const extractSass = new ExtractTextPlugin({ filename: 'ace-diff.min.css' });

// Using CSS import in /src would mean that anyone using this package
// with /src would also need to include and transpile our CSS
// I'd rather have it as a choice whether I want to use that CSS or my own
module.exports = {
  entry: {
    'ace-diff': './src/index.js',
    ignore: './src/styles/ace-diff.scss', // We need a standalone file
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].min.js',
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
      {
        test: /\.scss$/,
        use: extractSass.extract({
          use: [
            { loader: 'css-loader', options: { minimize: true } },
            {
              loader: 'postcss-loader',
              options: {
                plugins() { return [autoprefixer('last 2 versions', 'ie 10')]; },
              },
            },
            { loader: 'sass-loader' },
          ],
        }),
      },
    ],
  },
  externals: {
    brace: {
      commonjs: 'brace',
      commonjs2: 'brace',
      amd: 'brace',
      root: 'ace',
    },
  },
  plugins: [
    extractSass,
    new UglifyJsPlugin(),
    new webpack.BannerPlugin('Ace-diff | github.com/ace-diff/ace-diff'),
  ],
};

const path = require('path');
const webpack = require('webpack');
const UglifyJsPlugin = require('uglifyjs-webpack-plugin');
const autoprefixer = require('autoprefixer');
const cssnano = require('cssnano');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

// Using CSS import in /src would mean that anyone using this package
// with /src would also need to include and transpile our CSS
// I'd rather have it as a choice whether I want to use that CSS or my own
module.exports = {
  entry: {
    'ace-diff': './src/index.js',
    'ace-diff-light': './src/styles/ace-diff.scss',
    'ace-diff-dark': './src/styles/ace-diff-dark.scss',
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
            presets: ['@babel/preset-env'],
          },
        },
      },
      {
        test: /\.scss$/,
        use: [
          MiniCssExtractPlugin.loader,
          { loader: 'css-loader' },
          {
            loader: 'postcss-loader',
            options: {
              plugins() { return [autoprefixer('> 5%'), cssnano]; },
            },
          },
          { loader: 'sass-loader' },
        ],
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
    new MiniCssExtractPlugin({
      // Options similar to the same options in webpackOptions.output
      // both options are optional
      filename: '[name].css',
      chunkFilename: '[id].css',
    }),
    new UglifyJsPlugin(),
    new webpack.BannerPlugin('Ace-diff | github.com/ace-diff/ace-diff'),
  ],
};

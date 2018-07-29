const path = require('path');
//const SWPrecacheWebpackPlugin = require('sw-precache-webpack-plugin');

module.exports = {
  entry: ['idempotent-babel-polyfill', './src/index.js'],
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'build')
  },
  mode: "production",
  module: {
    rules: [
      {
        test: /\.(png|svg|jpg|gif|mp3|wav)$/,
        use: [
          'file-loader'
        ]
      },
      {
      test: /\.js$/,
      exclude: /(node_modules|bower_components)/,
      use: {
        loader: 'babel-loader',
        options: {
          presets: ['@babel/preset-env'],
        }
      }
    }
    ]
  },
  /*plugins: [
    new SWPrecacheWebpackPlugin({
      staticFileGlobs: ['public/index.html', 'public/index.css'],
      mergeStaticsConfig: true,
      stripPrefix: 'public/'
    }),
  ]*/
};

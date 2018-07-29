const defaultConfig = require('./webpack.config');

module.exports = {
  ...defaultConfig,
  mode: "development",
  watch: true,
  watchOptions: {
    ignored: /node_modules/
  },
};

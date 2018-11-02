const dotenv = require('dotenv')
const useDefaultConfig = require('@ionic/app-scripts/config/webpack.config.js')
const webpack = require('webpack')
const webpackMerge = require('webpack-merge')

dotenv.config()

module.exports = {
  dev: webpackMerge(useDefaultConfig.dev, {
    plugins: [
      new webpack.EnvironmentPlugin({
        SENTRY_DSN: process.env.SENTRY_DSN || ''
      })
    ]
  }),
  prod: webpackMerge(useDefaultConfig.prod, {
    plugins: [
      new webpack.EnvironmentPlugin({
        SENTRY_DSN: process.env.SENTRY_DSN || ''
      })
    ]
  })
}

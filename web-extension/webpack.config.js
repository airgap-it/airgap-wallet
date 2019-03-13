module.exports = {
  entry: {
    contentscript: './dist/contentscript.js',
    injection: './dist/injection.js',
    background: './dist/background.js'
  },
  watch: false,
  mode: 'production',
  module: {
    rules: [
      {
        test: /\.js$/,
        loader: 'string-replace-loader',
        options: {
          multiple: [{ search: "Function('return this')()", replace: 'window' }]
        }
      }
    ]
  }
}

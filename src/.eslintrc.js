module.exports = {
  extends: '../.eslintrc.js',
  parserOptions: {
    project: ['tsconfig.app.json'],
    tsconfigRootDir: __dirname
  },
  rules: {
    '@angular-eslint/directive-selector': [
      'warn',
      {
        'type': 'attribute',
        'prefix': ['app'],
        'style': 'camelCase'
      }
    ],
    '@angular-eslint/component-selector': [
      'warn',
      {
        'type': 'element',
        'prefix': ['app', 'page'],
        'style': 'kebab-case'
      }
    ]
  }
}
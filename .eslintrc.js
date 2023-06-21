module.exports = {
  root: true,
  ignorePatterns: [
    'projects/**/*'
  ],
  overrides: [
    {
      files: [
        '*.ts'
      ],
      parserOptions: {
        createDefaultProgram: true
      },
      extends: [
        'plugin:@angular-eslint/recommended',
        'plugin:@angular-eslint/template/process-inline-templates',
        'plugin:@typescript-eslint/recommended',
        'prettier',
        'plugin:prettier/recommended'
      ],
      plugins: [
        'eslint-plugin-no-null',
        'eslint-plugin-react',
        '@typescript-eslint',
        'prefer-arrow',
        'import'
      ],
      rules: {
        '@angular-eslint/component-class-suffix': 'off',
        '@angular-eslint/component-selector': [
          'error',
          {
            'type': 'element',
            'prefix': 'airgap',
            'style': 'kebab-case'
          }
        ],
        '@angular-eslint/directive-selector': [
          'error',
          {
            'type': 'attribute',
            'prefix': 'airgap',
            'style': 'camelCase'
          }
        ],
        '@angular-eslint/no-forward-ref': 'error',
        '@angular-eslint/no-output-on-prefix': 'warn',
        '@angular-eslint/prefer-output-readonly': 'error',
        '@typescript-eslint/array-type': [
          'error',
          {
            'default': 'array'
          }
        ],
        '@typescript-eslint/await-thenable': 'warn',
        '@typescript-eslint/ban-types': 'warn',
        '@typescript-eslint/consistent-type-definitions': 'warn',
        '@typescript-eslint/explicit-member-accessibility': [
          'error',
          {
            'accessibility': 'explicit'
          }
        ],
        '@typescript-eslint/member-delimiter-style': [
          'error',
          {
            'multiline': {
              'delimiter': 'none',
              'requireLast': true
            },
            'singleline': {
              'delimiter': 'semi',
              'requireLast': false
            }
          }
        ],
        '@typescript-eslint/no-empty-function': 'warn',
        '@typescript-eslint/no-explicit-any': 'warn',
        '@typescript-eslint/no-extraneous-class': 'off',
        '@typescript-eslint/no-floating-promises': 'off',
        '@typescript-eslint/no-for-in-array': 'error',
        '@typescript-eslint/no-inferrable-types': 'off',
        '@typescript-eslint/no-require-imports': 'off',
        '@typescript-eslint/no-this-alias': 'error',
        '@typescript-eslint/no-unnecessary-boolean-literal-compare': 'error',
        '@typescript-eslint/no-unnecessary-qualifier': 'error',
        '@typescript-eslint/no-unnecessary-type-arguments': 'error',
        '@typescript-eslint/no-unnecessary-type-assertion': 'error',
        '@typescript-eslint/no-unused-vars': [
          'error',
          {
            'argsIgnorePattern': '^_',
            'varsIgnorePattern': '^_'
          }
        ],
        '@typescript-eslint/no-use-before-define': 'off',
        '@typescript-eslint/no-var-requires': 'error',
        '@typescript-eslint/prefer-for-of': 'off',
        '@typescript-eslint/prefer-readonly': 'error',
        '@typescript-eslint/promise-function-async': 'off',
        '@typescript-eslint/quotes': [
          'off',
          'single',
          {
            'allowTemplateLiterals': true
          }
        ],
        '@typescript-eslint/restrict-plus-operands': 'error',
        '@typescript-eslint/semi': [
          'error',
          'never'
        ],
        '@typescript-eslint/strict-boolean-expressions': 'off',
        '@typescript-eslint/type-annotation-spacing': 'off',
        '@typescript-eslint/unbound-method': 'warn',
        'arrow-parens': [
          'off',
          'always'
        ],
        'brace-style': [
          'off',
          'off'
        ],
        'class-methods-use-this': 'warn',
        'complexity': 'error',
        'default-case': 'warn',
        'eol-last': 'off',
        'import/no-default-export': 'error',
        'import/no-deprecated': 'error',
        'import/no-extraneous-dependencies': 'warn',
        'import/no-internal-modules': 'off',
        'import/no-unassigned-import': 'off',
        'import/order': 'error',
        'linebreak-style': 'off',
        'max-classes-per-file': 'off',
        'max-len': 'off',
        'max-lines': 'off',
        'new-parens': 'off',
        'newline-per-chained-call': 'off',
        'no-duplicate-case': 'error',
        'no-duplicate-imports': 'warn',
        'no-empty': 'off',
        'no-extra-semi': 'off',
        'no-invalid-this': 'error',
        'no-irregular-whitespace': 'off',
        'no-magic-numbers': 'off',
        'no-null/no-null': 'off',
        'no-param-reassign': 'warn',
        'no-redeclare': 'off',
        'no-return-await': 'error',
        'no-sequences': 'error',
        'no-sparse-arrays': 'error',
        'no-template-curly-in-string': 'error',
        'no-trailing-spaces': 'off',
        'no-void': 'error',
        'padding-line-between-statements': 'off',
        'prefer-const': 'warn',
        'prefer-object-spread': 'off',
        'prefer-template': 'warn',
        'quote-props': 'off',
        'react/jsx-curly-spacing': 'off',
        'react/jsx-equals-spacing': 'off',
        'react/jsx-tag-spacing': [
          'off',
          {
            'afterOpening': 'allow',
            'closingSlash': 'allow'
          }
        ],
        'react/jsx-wrap-multilines': 'off',
        'space-before-function-paren': 'off',
        'space-in-parens': [
          'off',
          'never'
        ],
        'yoda': 'error'
      }
    },
    {
      files: [
        '*.html'
      ],
      extends: [
        'plugin:@angular-eslint/template/recommended'
      ],
      rules: {
        '@angular-eslint/template/conditional-complexity': 'off',
        '@angular-eslint/template/cyclomatic-complexity': 'off'
      }
    }
  ]
}

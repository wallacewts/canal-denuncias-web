// @ts-check
const eslint = require('@eslint/js');
const { defineConfig } = require('eslint/config');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');

module.exports = defineConfig([
  { ignores: ['dist/', 'coverage/', '.angular/', 'node_modules/'] },
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      tseslint.configs.recommended,
      tseslint.configs.stylistic,
      angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        { type: 'attribute', prefix: ['app', 'lib'], style: 'camelCase' },
      ],
      '@angular-eslint/component-selector': [
        'error',
        { type: 'element', prefix: ['app', 'lib'], style: 'kebab-case' },
      ],
      // Sem armazenamento de sessão ou dados no navegador: tudo vai em cookie HttpOnly emitido pela API.
      'no-restricted-globals': [
        'error',
        { name: 'localStorage', message: 'Não use localStorage: sessão fica em cookie HttpOnly.' },
        {
          name: 'sessionStorage',
          message: 'Não use sessionStorage: sessão fica em cookie HttpOnly.',
        },
      ],
      'no-restricted-properties': [
        'error',
        { object: 'window', property: 'localStorage', message: 'Não use localStorage.' },
        { object: 'window', property: 'sessionStorage', message: 'Não use sessionStorage.' },
        {
          object: 'document',
          property: 'cookie',
          message: 'Cookies de sessão são HttpOnly e gerenciados pela API.',
        },
      ],
    },
  },
  {
    files: ['**/*.html'],
    extends: [angular.configs.templateRecommended, angular.configs.templateAccessibility],
    rules: {},
  },
]);

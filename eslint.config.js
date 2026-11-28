// @ts-check
const eslint = require('@eslint/js');
const { defineConfig } = require('eslint/config');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');

const NO_TEST_TOOLS = {
  group: ['**/tools/**', '**/e2e/**'],
  message: 'Os apps não importam o servidor simulado nem o código dos testes e2e.',
};

module.exports = defineConfig([
  {
    ignores: [
      'dist/',
      'coverage/',
      '.angular/',
      'node_modules/',
      // Código gerado do contrato OpenAPI: nunca editado à mão.
      'projects/shared/src/lib/api/generated/',
      'e2e/report/',
      'e2e/test-results/',
    ],
  },
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
  // Nada no console no código dos apps e da lib (FTRV-11): erros não podem vazar dados da denúncia.
  {
    files: ['projects/*/src/**/*.ts'],
    ignores: ['**/*.spec.ts'],
    rules: { 'no-console': 'error' },
  },
  // Os apps e a lib nunca importam o servidor simulado nem o código dos testes e2e (feature 002, research R1):
  // respostas simuladas não podem chegar ao build de produção.
  {
    files: ['projects/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [NO_TEST_TOOLS] }],
    },
  },
  // O portal nunca importa o cliente administrativo (constituição, princípio V). A regra repete o padrão acima porque
  // a configuração do portal substitui a anterior.
  {
    files: ['projects/portal/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@canal/shared/api/admin',
              message: 'O portal não pode importar o cliente administrativo da API.',
            },
          ],
          patterns: [NO_TEST_TOOLS],
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

/**
 * @type {import('eslint').ESLint.ConfigData}
 */
module.exports = {
  root: true,

  env: {
    browser: true,
    es6: true,
    node: true,
  },

  parser: '@typescript-eslint/parser',

  plugins: ['@typescript-eslint'],

  parserOptions: {
    project: ['./tsconfig.json'],
    sourceType: 'module',
    extraFileExtensions: ['.json'],
  },

  ignorePatterns: ['.eslintrc.js', '**/*.js', '**/*.test.ts', '**/node_modules/**', '**/dist/**'],

  overrides: [
    {
      files: ['package.json'],
      plugins: ['eslint-plugin-n8n-nodes-base'],
      extends: ['plugin:n8n-nodes-base/community'],
      parserOptions: {
        project: null,
      },
      rules: {
        'n8n-nodes-base/community-package-json-name-still-default': 'off',
      },
    },
    {
      files: ['./credentials/**/*.ts'],
      plugins: ['eslint-plugin-n8n-nodes-base'],
      extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended', 'prettier'],
      rules: {
        'n8n-nodes-base/cred-class-field-documentation-url-missing': 'off',
        'n8n-nodes-base/cred-class-field-documentation-url-miscased': 'off',
        'n8n-nodes-base/cred-filename-against-convention': 'off',
        '@typescript-eslint/no-explicit-any': 'warn',
      },
    },
    {
      files: ['./nodes/**/*.ts'],
      plugins: ['eslint-plugin-n8n-nodes-base'],
      extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:n8n-nodes-base/nodes',
        'prettier',
      ],
      rules: {
        'n8n-nodes-base/node-class-description-inputs-wrong-regular-node': 'off',
        'n8n-nodes-base/node-class-description-outputs-wrong': 'off',
        'n8n-nodes-base/node-execute-block-missing-continue-on-fail': 'off',
        'n8n-nodes-base/node-execute-block-wrong-error-thrown': 'off',
        'n8n-nodes-base/node-resource-description-filename-against-convention': 'off',
        'n8n-nodes-base/node-param-collection-type-unsorted-items': 'off',
        'n8n-nodes-base/node-param-fixed-collection-type-unsorted-items': 'off',
        '@typescript-eslint/no-explicit-any': 'warn',
      },
    },
  ],
};

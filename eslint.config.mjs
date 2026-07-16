import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import prettier from 'eslint-config-prettier';
import globals from 'globals';
import jsdoc from 'eslint-plugin-jsdoc';

// noinspection JSCheckFunctionSignatures
export default tseslint.config(
  {
    ignores: [
      'dist/',
      '.output/',
      '.wxt/',
      'node_modules/',
      '*.config.ts',
      'eslint.config.*',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended ,
  {
    files: ['**/*.{js,mjs,cjs,ts,tsx,mts,cts}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      parserOptions: {
        ecmaFeatures: {jsx: true},
      },
    },
    rules: {
      eqeqeq: ['error', 'always'],
      'object-shorthand': 'error',
      'no-var': 'error',
      'prefer-const': ['error', {destructuring: 'all'}],
      'spaced-comment': ['error', 'always', {markers: ['/', '!']}],
      'require-jsdoc': 'off',
      'valid-jsdoc': 'off',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      'no-throw-literal': 'error',
      'no-array-constructor': 'off',
      '@typescript-eslint/no-array-constructor': 'error',
    },
  },
  {
    files: ['src/**/*'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'ExportDefaultDeclaration',
          message:
            'Google TS Style Guide: no default exports; use named exports.',
        },
      ],
    },
  },
  {
    files: ['src/entrypoints/**/*'],
    rules: {
      'no-restricted-syntax': 'off',
    },
  },
  {
    files: ['env.d.ts'],
    rules: {
      '@typescript-eslint/triple-slash-reference': 'off',
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    ...react.configs.flat.recommended,
    settings: {react: {version: 'detect'}},
  },
  {
    files: ['**/*.{ts,tsx}'],
    ...react.configs.flat['jsx-runtime'],
  },
  {
    files: ['**/*.{ts,tsx}'],
    ...reactHooks.configs['recommended-latest'],
  },
  prettier,
  {
    files: ['**/*.{js,mjs,cjs,ts,tsx,mts,cts}'],
    rules: {
      'max-len': [
        'error',
        {
          code: 80,
          tabWidth: 2,
          ignoreUrls: true,
          ignoreStrings: true,
          ignoreTemplateLiterals: true,
          ignoreRegExpLiterals: true,
        },
      ],
    },
  },
);

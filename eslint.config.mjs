import tseslint from 'typescript-eslint';
import prettierPlugin from 'eslint-plugin-prettier';
import prettierConfig from 'eslint-config-prettier';
import tsParser from '@typescript-eslint/parser';
import jestPlugin from 'eslint-plugin-jest';

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    ignores: ['dist', 'node_modules', 'coverage', 'cdk.out'],
  },
  {
    files: ['src/**/*.{js,mj,ts}', '**/__tests__/**/*'],
  },
  {
    languageOptions: {
      parser: tsParser,
      sourceType: 'module',
      parserOptions: {
        project: './tsconfig.json',
      },
    },
  },
  { plugins: { tseslint, prettierPlugin, jestPlugin } },
  ...tseslint.configs.recommended,
  {
    rules: {
      ...tseslint.configs.recommended.rules,
      ...prettierConfig.rules,
      'linebreak-style': ['error', 'unix'],
      'no-new': 'off',
      'class-methods-use-this': 'off',
      'no-console': 'warn',
      'no-unused-vars': 'warn',
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-empty-object-type': 'warn',
    },
  },
];

import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

const bannedSyntax = [
  {
    selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']",
    message: 'Banned: render text through JSX text nodes.',
  },
  {
    selector: 'MemberExpression[property.name=/^(innerHTML|outerHTML)$/]',
    message: 'Banned: innerHTML/outerHTML.',
  },
  {
    selector: "CallExpression[callee.property.name='insertAdjacentHTML']",
    message: 'Banned: insertAdjacentHTML.',
  },
];

export default tseslint.config(
  {
    ignores: [
      'dist',
      'dist-e2e',
      'test-results',
      'playwright-report',
      'docs',
      'src/notation/glyphs.ts',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      globals: globals.browser,
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'no-restricted-syntax': ['error', ...bannedSyntax],
      'no-restricted-globals': [
        'error',
        'localStorage',
        'sessionStorage',
        'alert',
        'confirm',
        'prompt',
      ],
      'no-restricted-properties': [
        'error',
        { object: 'window', property: 'alert' },
        { object: 'window', property: 'confirm' },
        { object: 'window', property: 'prompt' },
        { object: 'window', property: 'localStorage' },
        { object: 'window', property: 'sessionStorage' },
        { object: 'document', property: 'write' },
      ],
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-console': ['error', { allow: ['warn', 'error'] }],
      eqeqeq: 'error',
    },
  },
  {
    // The domain layer is pure: no clock, no randomness, no I/O, no UI.
    files: ['src/domain/**/*.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        ...bannedSyntax,
        {
          selector: "NewExpression[callee.name='Date'][arguments.length=0]",
          message: 'Pass `now` in.',
        },
        {
          selector: "MemberExpression[object.name='Date'][property.name='now']",
          message: 'Pass `now` in.',
        },
        {
          selector: "MemberExpression[object.name='Math'][property.name='random']",
          message: 'Use domain/rng.',
        },
      ],
      'no-console': 'error',
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            'react',
            'react-dom',
            'react/*',
            'idb',
            '**/data',
            '**/data/**',
            '**/ui',
            '**/ui/**',
            '**/screens',
            '**/screens/**',
            '**/app',
            '**/app/**',
            '**/audio',
            '**/audio/**',
            '**/notation',
            '**/notation/**',
            '**/pwa',
            '**/pwa/**',
          ],
        },
      ],
    },
  },
  {
    // Screens and UI never touch IndexedDB directly; they use data/ProgressContext.
    files: ['src/ui/**/*.{ts,tsx}', 'src/screens/**/*.{ts,tsx}', 'src/app/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', { patterns: ['idb', '**/data/db', '**/data/store'] }],
    },
  },
  {
    files: ['**/*.js', '**/*.mjs'],
    extends: [tseslint.configs.disableTypeChecked],
    languageOptions: { globals: globals.node },
    rules: { 'no-console': 'off' },
  },
);

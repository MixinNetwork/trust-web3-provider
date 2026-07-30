import globals from 'globals';
import tseslint from 'typescript-eslint';

export default [
  { languageOptions: { globals: globals.browser } },
  ...tseslint.configs.recommended,
  {
    ignores: [
      'templates/**',
      '**/dist/**',
      'android/**/build/**',
      'android/lib/src/main/res/raw/**',
      'packages/ios-web3-provider/swift/*.js',
    ],
  },
  {
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-namespace': 'off',
    },
  },
];

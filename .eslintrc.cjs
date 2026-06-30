module.exports = {
  root: true,
  env: { browser: true, es2022: true, node: true },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'prettier',
  ],
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module', ecmaFeatures: { jsx: true } },
  settings: { react: { version: 'detect' } },
  plugins: ['react-refresh'],
  ignorePatterns: ['dist', 'backend', 'node_modules', '*.config.js', '*.config.cjs'],
  rules: {
    'react/react-in-jsx-scope': 'off',
    'react/prop-types': 'off',
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    'react-refresh/only-export-components': 'off',
  },
  overrides: [
    {
      files: ['tests/**/*.mjs', '**/*.test.js', '**/*.test.jsx'],
      env: { node: true },
      globals: { vi: 'readonly', describe: 'readonly', it: 'readonly', expect: 'readonly', test: 'readonly' },
    },
  ],
};

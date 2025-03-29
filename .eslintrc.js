module.exports = {
  env: {
    node: true,
    commonjs: true,
    es2021: true,
    jest: true,
  },
  extends: ['eslint:recommended'],
  parserOptions: {
    ecmaVersion: 12,
  },
  rules: {
    // Error prevention
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    'no-console': 'warn',
    'no-undef': 'error',
    
    // Code style
    'semi': ['error', 'always'],
    'indent': ['warn', 2],
    'quotes': ['warn', 'single'],
    'comma-dangle': ['warn', 'always-multiline'],
    
    // Allow certain patterns common in Express apps
    'no-unused-vars': ['error', { 'argsIgnorePattern': 'next|req|res' }],
    
    // Relax some rules for development
    'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'warn',
  },
};

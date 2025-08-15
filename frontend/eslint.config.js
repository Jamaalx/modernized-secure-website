// eslint.config.js - Frontend ESLint Configuration - 2025 Modernized
import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import react from 'eslint-plugin-react';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';

export default [
  {
    ignores: [
      'dist/**',
      'build/**',
      'node_modules/**',
      'coverage/**',
      'public/**',
      '*.config.js',
      '*.config.ts',
      '.eslintrc.*',
      'vite-env.d.ts'
    ]
  },
  
  // Base JavaScript configuration
  js.configs.recommended,
  
  // TypeScript configuration
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true
        },
        project: './tsconfig.json'
      }
    },
    plugins: {
      '@typescript-eslint': tseslint
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      ...tseslint.configs['recommended-requiring-type-checking'].rules,
      
      // TypeScript specific rules
      '@typescript-eslint/no-unused-vars': ['error', { 
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_'
      }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/prefer-nullish-coalescing': 'error',
      '@typescript-eslint/prefer-optional-chain': 'error',
      '@typescript-eslint/no-unnecessary-type-assertion': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/require-await': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'warn',
      '@typescript-eslint/no-unsafe-member-access': 'warn',
      '@typescript-eslint/no-unsafe-call': 'warn',
      '@typescript-eslint/no-unsafe-return': 'warn'
    }
  },
  
  // React configuration
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        React: 'readonly',
        JSX: 'readonly'
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true
        }
      }
    },
    plugins: {
      react,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh
    },
    rules: {
      // React rules
      ...react.configs.recommended.rules,
      ...react.configs['jsx-runtime'].rules,
      
      // React Hooks rules
      ...reactHooks.configs.recommended.rules,
      
      // React Refresh rules
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true }
      ],
      
      // Custom React rules
      'react/prop-types': 'off', // Using TypeScript for prop validation
      'react/react-in-jsx-scope': 'off', // Not needed with new JSX transform
      'react/jsx-uses-react': 'off', // Not needed with new JSX transform
      'react/jsx-no-target-blank': ['error', { 
        allowReferrer: false,
        enforceDynamicLinks: 'always'
      }],
      'react/jsx-key': ['error', {
        checkFragmentShorthand: true,
        checkKeyMustBeforeSpread: true,
        warnOnDuplicates: true
      }],
      'react/jsx-no-useless-fragment': ['error', { allowExpressions: true }],
      'react/jsx-curly-brace-presence': ['error', {
        props: 'never',
        children: 'never'
      }],
      'react/self-closing-comp': ['error', {
        component: true,
        html: true
      }],
      'react/jsx-boolean-value': ['error', 'never'],
      'react/jsx-fragments': ['error', 'syntax'],
      'react/no-array-index-key': 'warn',
      'react/no-unstable-nested-components': 'error',
      'react/jsx-no-leaked-render': 'error'
    },
    settings: {
      react: {
        version: 'detect'
      }
    }
  },
  
  // General JavaScript/TypeScript rules
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    rules: {
      // Error prevention
      'no-unused-vars': 'off', // Handled by TypeScript
      'no-console': 'warn',
      'no-debugger': 'error',
      'no-alert': 'error',
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-script-url': 'error',
      
      // Code quality
      'prefer-const': 'error',
      'no-var': 'error',
      'object-shorthand': 'error',
      'prefer-arrow-callback': 'error',
      'prefer-template': 'error',
      'prefer-destructuring': ['error', {
        array: true,
        object: true
      }, {
        enforceForRenamedProperties: false
      }],
      'prefer-spread': 'error',
      'prefer-rest-params': 'error',
      
      // Best practices
      'eqeqeq': ['error', 'always'],
      'curly': ['error', 'all'],
      'dot-notation': 'error',
      'no-else-return': 'error',
      'no-empty-function': 'error',
      'no-magic-numbers': ['warn', { 
        ignore: [0, 1, -1, 2],
        ignoreArrayIndexes: true,
        enforceConst: true,
        detectObjects: false
      }],
      'no-duplicate-imports': 'error',
      'no-useless-rename': 'error',
      'no-useless-computed-key': 'error',
      'no-useless-constructor': 'error',
      'no-useless-return': 'error',
      
      // Style (handled by Prettier, but some logical rules)
      'prefer-single-var-declarator': 'off',
      'one-var': ['error', 'never'],
      'no-multiple-empty-lines': ['error', { 
        max: 2,
        maxEOF: 1,
        maxBOF: 0
      }],
      
      // Import/Export
      'sort-imports': ['error', {
        ignoreCase: false,
        ignoreDeclarationSort: true,
        ignoreMemberSort: false,
        memberSyntaxSortOrder: ['none', 'all', 'multiple', 'single'],
        allowSeparatedGroups: true
      }]
    }
  },
  
  // Test files configuration
  {
    files: ['**/*.{test,spec}.{js,jsx,ts,tsx}', '**/test/**/*.{js,jsx,ts,tsx}'],
    rules: {
      'no-magic-numbers': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      'react/display-name': 'off'
    }
  },
  
  // Configuration files
  {
    files: ['**/*.config.{js,ts}', '**/vite.config.{js,ts}'],
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-var-requires': 'off'
    }
  }
];


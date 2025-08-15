// vitest.config.ts - Frontend Testing Configuration - 2025 Modernized
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  
  test: {
    // Test environment
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    
    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.test.{ts,tsx}',
        '**/*.spec.{ts,tsx}',
        '**/*.config.{js,ts}',
        'dist/',
        'build/',
        'public/',
        'src/main.tsx',
        'src/vite-env.d.ts',
        '**/*.d.ts',
        'src/assets/',
        'src/styles/',
        '**/*.stories.{ts,tsx}',
        'src/mocks/',
        'src/test-utils/'
      ],
      include: ['src/**/*.{ts,tsx}'],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        }
      }
    },
    
    // Test timeouts
    testTimeout: 10000,
    hookTimeout: 10000,
    
    // Test file patterns
    include: [
      'src/**/*.{test,spec}.{ts,tsx}',
      'tests/**/*.{test,spec}.{ts,tsx}'
    ],
    exclude: [
      'node_modules/',
      'dist/',
      'build/',
      '.git/',
      '.cache/'
    ],
    
    // Watch mode configuration
    watch: {
      ignore: [
        'node_modules/',
        'dist/',
        'build/',
        'coverage/',
        '.git/'
      ]
    },
    
    // Reporter configuration
    reporter: ['verbose', 'json', 'html'],
    outputFile: {
      json: './test-results/results.json',
      html: './test-results/index.html'
    },
    
    // Retry configuration
    retry: 2,
    
    // Concurrent tests
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        maxThreads: 4,
        minThreads: 1
      }
    },
    
    // Mock configuration
    clearMocks: true,
    restoreMocks: true,
    mockReset: true,
    
    // Environment variables for tests
    env: {
      NODE_ENV: 'test',
      VITE_API_URL: 'http://localhost:3001',
      VITE_APP_NAME: 'Secure Documents Test'
    }
  },
  
  // Path resolution (same as main config)
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@/components': resolve(__dirname, './src/components'),
      '@/pages': resolve(__dirname, './src/pages'),
      '@/hooks': resolve(__dirname, './src/hooks'),
      '@/utils': resolve(__dirname, './src/utils'),
      '@/types': resolve(__dirname, './src/types'),
      '@/assets': resolve(__dirname, './src/assets'),
      '@/styles': resolve(__dirname, './src/styles'),
      '@/lib': resolve(__dirname, './src/lib'),
      '@/store': resolve(__dirname, './src/store'),
      '@/api': resolve(__dirname, './src/api')
    }
  },
  
  // Define global variables for tests
  define: {
    __TEST__: true,
    __DEV__: false,
    __PROD__: false
  }
});


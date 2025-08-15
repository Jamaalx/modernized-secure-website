// frontend/vite.config.js - Vite 7 Configuration - 2025 Modernized
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { resolve } from 'path';

export default defineConfig(({ command, mode }) => {
  // Load environment variables
  const env = loadEnv(mode, process.cwd(), '');
  
  const isProduction = mode === 'production';
  const isDevelopment = mode === 'development';
  
  return {
    plugins: [
      react({
        // React 19 optimizations
        jsxRuntime: 'automatic',
        jsxImportSource: 'react',
        babel: {
          plugins: [
            // Add any Babel plugins here if needed
          ]
        }
      }),
      
      // Progressive Web App configuration
      VitePWA({
        registerType: 'autoUpdate',
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/api\./,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'api-cache',
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 60 * 60 * 24 // 24 hours
                }
              }
            }
          ]
        },
        manifest: {
          name: 'Secure Documents',
          short_name: 'SecureDocs',
          description: 'Secure document sharing platform',
          theme_color: '#1f2937',
          background_color: '#ffffff',
          display: 'standalone',
          orientation: 'portrait',
          scope: '/',
          start_url: '/',
          icons: [
            {
              src: '/icons/icon-192x192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: '/icons/icon-512x512.png',
              sizes: '512x512',
              type: 'image/png'
            }
          ]
        }
      })
    ],
    
    // Path resolution
    resolve: {
      alias: {
        '@': resolve(__dirname, './src'),
        '@components': resolve(__dirname, './src/components'),
        '@pages': resolve(__dirname, './src/pages'),
        '@hooks': resolve(__dirname, './src/hooks'),
        '@utils': resolve(__dirname, './src/utils'),
        '@types': resolve(__dirname, './src/types'),
        '@assets': resolve(__dirname, './src/assets'),
        '@styles': resolve(__dirname, './src/styles')
      }
    },
    
    // Development server configuration
    server: {
      port: parseInt(env.VITE_PORT) || 3000,
      host: env.VITE_HOST || 'localhost',
      strictPort: true,
      open: isDevelopment,
      cors: true,
      
      // Enhanced proxy configuration
      proxy: {
        '/api': {
          target: env.VITE_API_URL || 'http://localhost:3001',
          changeOrigin: true,
          secure: isProduction,
          timeout: 30000,
          configure: (proxy, options) => {
            proxy.on('error', (err, req, res) => {
              console.error('Proxy error:', err);
            });
            proxy.on('proxyReq', (proxyReq, req, res) => {
              // Add security headers to proxied requests
              proxyReq.setHeader('X-Forwarded-Proto', 'https');
            });
          }
        }
      },
      
      // Security headers for development
      headers: {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Referrer-Policy': 'strict-origin-when-cross-origin'
      }
    },
    
    // Preview server configuration
    preview: {
      port: parseInt(env.VITE_PREVIEW_PORT) || 4173,
      host: env.VITE_HOST || 'localhost',
      strictPort: true,
      cors: true
    },
    
    // Build configuration
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: !isProduction || env.VITE_BUILD_SOURCEMAP === 'true',
      minify: isProduction ? 'esbuild' : false,
      target: 'esnext',
      
      // Enhanced chunk splitting for better caching
      rollupOptions: {
        output: {
          manualChunks: {
            // Core React libraries
            'react-vendor': ['react', 'react-dom'],
            
            // Routing
            'router': ['react-router-dom'],
            
            // UI libraries
            'ui-vendor': [
              'lucide-react',
              'framer-motion',
              '@radix-ui/react-dialog',
              '@radix-ui/react-dropdown-menu',
              '@radix-ui/react-toast',
              '@radix-ui/react-tooltip'
            ],
            
            // Data fetching and forms
            'data-vendor': [
              '@tanstack/react-query',
              'axios',
              'react-hook-form',
              '@hookform/resolvers',
              'zod'
            ],
            
            // Utilities
            'utils-vendor': [
              'clsx',
              'tailwind-merge',
              'date-fns',
              'file-saver',
              'use-debounce'
            ],
            
            // Charts and visualization
            'charts-vendor': ['recharts']
          },
          
          // Asset naming for better caching
          chunkFileNames: (chunkInfo) => {
            const facadeModuleId = chunkInfo.facadeModuleId
              ? chunkInfo.facadeModuleId.split('/').pop().replace(/\.[^.]*$/, '')
              : 'chunk';
            return `js/${facadeModuleId}-[hash].js`;
          },
          assetFileNames: (assetInfo) => {
            const info = assetInfo.name.split('.');
            const ext = info[info.length - 1];
            if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
              return `images/[name]-[hash][extname]`;
            }
            if (/css/i.test(ext)) {
              return `css/[name]-[hash][extname]`;
            }
            if (/woff2?|eot|ttf|otf/i.test(ext)) {
              return `fonts/[name]-[hash][extname]`;
            }
            return `assets/[name]-[hash][extname]`;
          }
        }
      },
      
      // Build optimizations
      cssCodeSplit: true,
      cssMinify: isProduction,
      reportCompressedSize: isProduction,
      chunkSizeWarningLimit: 1000,
      
      // Security: Remove console logs in production
      terserOptions: isProduction ? {
        compress: {
          drop_console: true,
          drop_debugger: true
        }
      } : undefined
    },
    
    // CSS configuration
    css: {
      devSourcemap: isDevelopment,
      preprocessorOptions: {
        scss: {
          additionalData: `@import "@/styles/variables.scss";`
        }
      }
    },
    
    // Environment variables
    define: {
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
      __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
      __DEV__: isDevelopment,
      __PROD__: isProduction
    },
    
    // Optimization
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        '@tanstack/react-query',
        'axios',
        'react-hook-form',
        'zod',
        'lucide-react',
        'framer-motion'
      ],
      exclude: ['@vite/client', '@vite/env']
    },
    
    // ESBuild configuration
    esbuild: {
      target: 'esnext',
      platform: 'browser',
      format: 'esm',
      // Remove console logs in production
      drop: isProduction ? ['console', 'debugger'] : []
    },
    
    // Worker configuration
    worker: {
      format: 'es'
    },
    
    // Experimental features
    experimental: {
      renderBuiltUrl(filename, { hostType }) {
        if (hostType === 'js') {
          return { js: `/${filename}` };
        } else {
          return { relative: true };
        }
      }
    }
  };
});


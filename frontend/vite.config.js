import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    react({
      include: [/\.jsx?$/, /\.tsx?$/],
      // Enable fast refresh for better DX
      fastRefresh: true,
    })
  ],
  server: {
    port: 3000,
    open: true, // Auto-open browser
    host: true, // Enable network access
  },
  preview: {
    port: 3000,
    open: true
  },
  build: {
    // Generate source maps for better debugging
    sourcemap: true,
    // Optimize chunk splitting
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          ui: ['lucide-react'],
          utils: ['dayjs']
        }
      }
    }
  },
  optimizeDeps: {
    // Pre-bundle these dependencies for faster dev startup
    include: ['react', 'react-dom', 'react-router-dom', 'lucide-react', 'dayjs']
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.js'],
    // Better test coverage reports
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html']
    }
  }
});
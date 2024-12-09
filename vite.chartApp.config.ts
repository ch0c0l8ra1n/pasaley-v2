import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { fileURLToPath } from 'url'
import path from 'path'
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    cssInjectedByJsPlugin({styleId: 'pasaley-css'}),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src/')
    }
  },
  build: {
    rollupOptions: {
      input: {
        chartApp: path.resolve(__dirname, 'src/content-scripts/chart/index.tsx'),
      },
      output: {
        entryFileNames: 'assets/chartApp/[name].js',
        chunkFileNames: 'assets/chartApp/[name].js',
        assetFileNames: 'assets/chartApp/[name].[ext]',
      }
    },
    // minify: false,
    emptyOutDir: false,
  }
})

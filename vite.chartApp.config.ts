import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { fileURLToPath } from 'url'
import path from 'path'
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js'
import { manifest, outDir } from './vite.variant'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    cssInjectedByJsPlugin({styleId: 'pasaley-css'}),
    manifest(mode),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src/')
    }
  },
  build: {
    outDir: outDir(mode),
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
}))

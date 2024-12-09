import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
    resolve: {
        alias: {
          "@": path.resolve(__dirname, "./src/"),
        },
      },
    build: {
        outDir: 'public',
        rollupOptions: {
            input: {
                interceptor: 'src/content-scripts/injector/interceptor.ts'
            },
            output: {
                entryFileNames: '[name].js',
                chunkFileNames: '[name].js',
                assetFileNames: '[name].[ext]'
            }
        },
        minify: false,
        emptyOutDir: false,
    }
});
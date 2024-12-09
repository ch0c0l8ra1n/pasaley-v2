import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
    plugins: [],
    resolve: {
        alias: {
          "@": path.resolve(__dirname, "./src/"),
        },
      },
    build: {
        outDir: 'dist',
        rollupOptions: {
            input: {
                interceptor: 'src/content-scripts/interceptor/interceptor.ts'
            },
            output: {
                entryFileNames: 'assets/interceptor/[name].js',
                chunkFileNames: 'assets/interceptor/[name].js',
                assetFileNames: 'assets/interceptor/[name].[ext]'
            }
        },
        // minify: false,
        emptyOutDir: false,
    }
});
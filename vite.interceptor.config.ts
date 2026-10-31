import { defineConfig } from 'vite';
import path from 'path';
import { manifest, outDir } from './vite.variant';

export default defineConfig(({ mode }) => ({
    plugins: [manifest(mode)],
    resolve: {
        alias: {
          "@": path.resolve(__dirname, "./src/"),
        },
      },
    build: {
        outDir: outDir(mode),
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
}));
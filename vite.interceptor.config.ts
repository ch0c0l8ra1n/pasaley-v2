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
                interceptor: 'src/content-scripts/interceptor/interceptor.ts',
                signer: 'src/content-scripts/signer/signer.ts',
                background: 'src/background/background.ts',
                account: 'src/account/account.ts',
            },
            output: {
                // None of these can import, so they must not share a chunk.
                entryFileNames: 'assets/[name]/[name].js',
                chunkFileNames: 'assets/shared/[name].js',
                assetFileNames: 'assets/[name]/[name].[ext]'
            }
        },
        // minify: false,
        emptyOutDir: false,
    }
}));
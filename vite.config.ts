import { defineConfig } from 'vite';

export default defineConfig({
    resolve: {
        alias: {
            'obsidian': './tests/mocks/obsidian.mock.ts'
        }
    },
    build: {
        target: 'es2016',
        outDir: '.',
        emptyOutDir: false,
        sourcemap: 'inline',
        lib: {
            entry: 'src/main.ts',
            formats: ['cjs'],
            fileName: () => 'main.js'
        },
        rollupOptions: {
            external: ['obsidian'],
            output: {
                globals: {
                    obsidian: 'obsidian'
                }
            }
        }
    }
}); 
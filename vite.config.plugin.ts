import { defineConfig } from "vite";
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      input: {
        plugin: "src/plugin.ts",
      },
      output: {
        entryFileNames: "[name].js",
        inlineDynamicImports: true,
      },
    },
  },
});

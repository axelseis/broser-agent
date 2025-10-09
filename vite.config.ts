import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import livePreview from "vite-live-preview";
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    livePreview({
      reload: true,
      config: {
        build: {
          sourcemap: true,
        },
      },
    }),
    nodePolyfills({ include: ['stream', 'util'] }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    emptyOutDir: false,
    rollupOptions: {
      input: {
        main: "src/main/main.tsx",
        index: "./index.html",
      },
      output: {
        entryFileNames: "[name].js",
      },
    },
  },
  server: {
    port: 5174,
    cors: true,
  },
  preview: {
    port: 4400,
    cors: true,
  },
});

import { defineConfig } from "vite";
import livePreview from "vite-live-preview";
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
  plugins: [
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
  build: {
    emptyOutDir: false,
    rollupOptions: {
      input: {
        main: "src/main/main.ts",
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

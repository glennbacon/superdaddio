import { defineConfig } from 'vite';

export default defineConfig({
  // relative URLs, so the built game can be served from any folder
  base: './',
  build: {
    // three.js and the physics engine make one ~800 kB script (195 kB gzipped); that is expected
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      // a fixed file name: the page is republished in place, and the host versions it as a whole
      output: { entryFileNames: 'assets/game.js', chunkFileNames: 'assets/[name].js', assetFileNames: 'assets/[name][extname]' },
    },
  },
});

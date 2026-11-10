import { defineConfig } from 'vite';

export default defineConfig({
  // relative URLs, so the built game can be served from any folder
  base: './',
  build: {
    // keep every asset as a file; the game has hundreds of small images and inlining them bloats the JS
    assetsInlineLimit: 0,
    // three.js and the physics engine make one ~800 kB script (190 kB gzipped); that is expected
    chunkSizeWarningLimit: 1000,
  },
});

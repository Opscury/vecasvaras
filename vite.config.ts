import { defineConfig, type Plugin } from 'vite';
import { resolve } from 'node:path';
import { renderAvoti } from './src/avoti-render';

/**
 * The «Avoti» page is rendered to static HTML from src/content/avoti.ts at
 * build time (and on every request in dev), so it opens without the game and
 * without scripts. Edit the sources there; this only drops them in.
 */
function avoti(): Plugin {
  const updated = new Date().toISOString().slice(0, 10);
  return {
    name: 'avoti',
    transformIndexHtml: {
      order: 'pre',
      handler(html, ctx) {
        if (!ctx.filename.replace(/\\/g, '/').endsWith('/avoti/index.html')) return html;
        return html.replace('<!--AVOTI-->', renderAvoti(updated));
      },
    },
  };
}

export default defineConfig({
  base: './',
  server: { port: 5173, open: false },
  plugins: [avoti()],
  build: {
    target: 'es2020',
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        avoti: resolve(__dirname, 'avoti/index.html'),
      },
    },
  },
});

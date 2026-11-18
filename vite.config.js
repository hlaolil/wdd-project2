import { defineConfig } from 'vite';

export default defineConfig({
  base: './', // relative paths so the build works in a sub-folder (e.g. /wdd130/books/)
  server: { port: 5173 },
});

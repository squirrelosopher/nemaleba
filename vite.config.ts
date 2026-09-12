import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { devApiServer } from './scripts/devApiServer';

export default defineConfig({
  plugins: [sveltekit(), devApiServer()],
  server: {
    port: 5173,
    strictPort: true,
    watch: { ignored: ['**/build/**', '**/.cache/**'] }
  }
});

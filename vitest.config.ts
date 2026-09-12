import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Plain TypeScript only: the pipeline, and the pure modules under src/lib that both it
// and the browser use. No Svelte plugin and no browser environment -- components are left
// to `svelte-check`. The alias stands in for the one SvelteKit would provide, since these
// modules import each other by `$lib`.
export default defineConfig({
  resolve: {
    alias: {
      $lib: fileURLToPath(new URL('./src/lib', import.meta.url))
    }
  },
  test: {
    include: ['scripts/**/*.test.ts', 'src/**/*.test.ts'],
    environment: 'node'
  }
});

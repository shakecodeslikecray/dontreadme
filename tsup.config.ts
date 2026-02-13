import { defineConfig } from 'tsup';

export default defineConfig([
  // CLI build with shebang
  {
    entry: { 'cli/index': 'src/cli/index.ts' },
    format: ['esm'],
    dts: true,
    sourcemap: true,
    clean: true,
    splitting: false,
    treeshake: true,
    minify: false,
    target: 'node18',
    banner: { js: '#!/usr/bin/env node' },
    external: ['typescript'],
  },
  // Library build without shebang
  {
    entry: { index: 'src/index.ts' },
    format: ['esm'],
    dts: true,
    sourcemap: true,
    clean: false,
    splitting: false,
    treeshake: true,
    minify: false,
    target: 'node18',
    external: ['typescript'],
  },
]);

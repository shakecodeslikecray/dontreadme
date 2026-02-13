import * as p from '@clack/prompts';
import chalk from 'chalk';
import chokidar from 'chokidar';
import { isInitialized, ensureDontreadmeDir } from '../../core/config.js';
import { discoverFiles } from '../../core/file-discovery.js';
import { runAnalyzers } from '../../analyzers/index.js';
import { writeAllArtifacts } from '../../writers/index.js';
import { injectBridgeBlock, detectBridgeFiles } from '../../core/bridge-files.js';

const DEBOUNCE_MS = 2000;

export async function watchCommand(): Promise<void> {
  const cwd = process.cwd();

  if (!isInitialized(cwd)) {
    p.log.error('Not initialized. Run `dontreadme init` first.');
    process.exit(1);
  }

  p.intro(chalk.bold('dontreadme') + chalk.dim(' - watch mode'));
  p.log.info(`Watching for changes (${DEBOUNCE_MS}ms debounce)...`);
  p.log.info('Press Ctrl+C to stop.');

  let timeout: ReturnType<typeof setTimeout> | null = null;
  let isRegenerating = false;

  async function regenerate(): Promise<void> {
    if (isRegenerating) return;
    isRegenerating = true;

    try {
      const files = await discoverFiles(cwd);
      const results = await runAnalyzers(cwd, files);

      ensureDontreadmeDir(cwd);

      let version = '0.1.0';
      try {
        const { readFileSync } = await import('fs');
        const { dirname, join } = await import('path');
        const { fileURLToPath } = await import('url');
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = dirname(__filename);
        const pkg = JSON.parse(readFileSync(join(__dirname, '../../../package.json'), 'utf-8'));
        version = pkg.version || version;
      } catch { /* use default */ }

      writeAllArtifacts({ cwd, results, files, version });

      // Update bridge files
      const bridges = detectBridgeFiles(cwd);
      for (const { path } of bridges) {
        injectBridgeBlock(path);
      }

      const now = new Date().toLocaleTimeString();
      p.log.success(`${chalk.dim(now)} Regenerated .dontreadme/`);
    } catch (error) {
      p.log.error(`Regeneration failed: ${error}`);
    } finally {
      isRegenerating = false;
    }
  }

  const watcher = chokidar.watch(['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'], {
    cwd,
    ignored: [
      'node_modules/**',
      'dist/**',
      'build/**',
      '.dontreadme/**',
      '.next/**',
      'coverage/**',
    ],
    persistent: true,
    ignoreInitial: true,
  });

  watcher.on('all', (_event, _path) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(regenerate, DEBOUNCE_MS);
  });

  // Keep the process alive
  await new Promise<void>(() => {});
}

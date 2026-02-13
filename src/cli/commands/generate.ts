import * as p from '@clack/prompts';
import chalk from 'chalk';
import { existsSync } from 'fs';
import { join } from 'path';
import { ArtifactName } from '../../types.js';
import { discoverFiles } from '../../core/file-discovery.js';
import { isInitialized, ensureDontreadmeDir } from '../../core/config.js';
import { runAnalyzers } from '../../analyzers/index.js';
import { writeAllArtifacts } from '../../writers/index.js';
import { injectBridgeBlock, detectBridgeFiles } from '../../core/bridge-files.js';

// Short aliases for --only flag
const ARTIFACT_ALIASES: Record<string, ArtifactName> = {
  'arch': 'architecture',
  'architecture': 'architecture',
  'deps': 'dependency-graph',
  'dep-graph': 'dependency-graph',
  'dependency-graph': 'dependency-graph',
  'api': 'api-surface',
  'api-surface': 'api-surface',
  'decisions': 'decisions',
  'hotspots': 'hotspots',
  'risk': 'risk-profile',
  'risk-profile': 'risk-profile',
  'understanding': 'understanding',
  'contracts': 'contracts',
};

interface GenerateOptions {
  only?: string;
}

export async function generateCommand(options: GenerateOptions): Promise<void> {
  const cwd = process.cwd();

  if (!isInitialized(cwd)) {
    p.log.error('Not initialized. Run `dontreadme init` first.');
    process.exit(1);
  }

  // Parse --only flag
  let only: ArtifactName[] | undefined;
  if (options.only) {
    only = options.only.split(',').map((s) => {
      const alias = ARTIFACT_ALIASES[s.trim()];
      if (!alias) {
        p.log.error(`Unknown artifact: ${s.trim()}`);
        p.log.info(`Available: ${Object.keys(ARTIFACT_ALIASES).join(', ')}`);
        process.exit(1);
      }
      return alias;
    });
  }

  p.intro(chalk.bold('dontreadme') + chalk.dim(' - generate'));

  const scanSpinner = p.spinner();
  scanSpinner.start('Scanning codebase...');

  const files = await discoverFiles(cwd);
  scanSpinner.stop(`Found ${files.length} source files`);

  const analyzeSpinner = p.spinner();
  analyzeSpinner.start('Running analyzers...');

  const results = await runAnalyzers(cwd, files, {
    only,
    onProgress: (progress) => {
      if (progress.status === 'started') {
        analyzeSpinner.message(`Analyzing ${progress.artifact}...`);
      }
    },
  });

  analyzeSpinner.stop('Analysis complete');

  const writeSpinner = p.spinner();
  writeSpinner.start('Writing artifacts...');

  ensureDontreadmeDir(cwd);

  let version = '0.1.0';
  try {
    const { readFileSync } = await import('fs');
    const { dirname } = await import('path');
    const { fileURLToPath } = await import('url');
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const pkg = JSON.parse(readFileSync(join(__dirname, '../../../package.json'), 'utf-8'));
    version = pkg.version || version;
  } catch { /* use default */ }

  writeAllArtifacts({ cwd, results, files, version });
  writeSpinner.stop('Artifacts written');

  // Update bridge files
  const bridges = detectBridgeFiles(cwd);
  for (const { path } of bridges) {
    injectBridgeBlock(path);
  }

  p.outro(chalk.green('Generation complete!'));
}

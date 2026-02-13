import * as p from '@clack/prompts';
import chalk from 'chalk';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { isInitialized, getDontreadmePath, loadManifest } from '../../core/config.js';
import { discoverFiles } from '../../core/file-discovery.js';
import { runAnalyzers } from '../../analyzers/index.js';
import { stableStringify, hashContent } from '../../core/utils.js';

export async function diffCommand(): Promise<void> {
  const cwd = process.cwd();

  if (!isInitialized(cwd)) {
    p.log.error('Not initialized. Run `dontreadme init` first.');
    process.exit(1);
  }

  p.intro(chalk.bold('dontreadme') + chalk.dim(' - diff'));

  const manifest = loadManifest(cwd);
  if (!manifest) {
    p.log.error('Cannot read manifest.json');
    process.exit(1);
  }

  const scanSpinner = p.spinner();
  scanSpinner.start('Scanning for changes...');

  const files = await discoverFiles(cwd);
  const results = await runAnalyzers(cwd, files);

  scanSpinner.stop('Scan complete');

  // Compare hashes of deterministic artifacts
  const dontreadmePath = getDontreadmePath(cwd);
  let changedCount = 0;

  const artifactData: Array<{ name: string; path: string; data: unknown }> = [
    { name: 'architecture', path: 'architecture.json', data: results.architecture.data },
    { name: 'dependency-graph', path: 'dependency-graph.json', data: results['dependency-graph'].data },
    { name: 'api-surface', path: 'api-surface.json', data: results['api-surface'].data },
    { name: 'decisions', path: 'decisions/index.json', data: results.decisions.data },
    { name: 'hotspots', path: 'hotspots.json', data: results.hotspots.data },
    { name: 'risk-profile', path: 'risk-profile.json', data: results['risk-profile'].data },
  ];

  for (const artifact of artifactData) {
    const newContent = stableStringify(artifact.data);
    const newHash = hashContent(newContent);

    const manifestEntry = manifest.artifacts.find((a) => a.name === artifact.name);
    const existingHash = manifestEntry?.hash || '';

    if (newHash !== existingHash) {
      p.log.warn(`${chalk.yellow('\u25CF')} ${artifact.name} - changed`);
      changedCount++;
    } else {
      p.log.message(`${chalk.green('\u25CF')} ${artifact.name} - unchanged`);
    }
  }

  if (changedCount === 0) {
    p.outro(chalk.green('No changes detected. Artifacts are up to date.'));
  } else {
    p.outro(chalk.yellow(`${changedCount} artifact(s) changed. Run \`dontreadme generate\` to update.`));
  }
}

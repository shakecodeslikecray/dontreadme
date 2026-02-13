import * as p from '@clack/prompts';
import chalk from 'chalk';
import { existsSync, rmSync } from 'fs';
import { join } from 'path';
import { discoverFiles } from '../../core/file-discovery.js';
import { ensureDontreadmeDir } from '../../core/config.js';
import { runAnalyzers } from '../../analyzers/index.js';
import { writeAllArtifacts } from '../../writers/index.js';
import { detectBridgeFiles, injectBridgeBlock, getBridgeSummary } from '../../core/bridge-files.js';
import { isGitRepo } from '../../core/git.js';

interface InitOptions {
  force: boolean;
}

export async function initCommand(options: InitOptions): Promise<void> {
  const cwd = process.cwd();
  const dontreadmePath = join(cwd, '.dontreadme');

  // Check if already initialized
  if (existsSync(dontreadmePath) && !options.force) {
    p.log.error('.dontreadme/ already exists. Use --force to reinitialize.');
    process.exit(1);
  }

  p.intro(chalk.bold('dontreadme') + chalk.dim(' - initialization'));

  // Phase 1: Check for git
  const hasGit = await isGitRepo(cwd);
  if (!hasGit) {
    p.log.warn('Not a git repository. Decision log and hotspot analysis will be skipped.');
  }

  // Phase 2: Discover files
  const scanSpinner = p.spinner();
  scanSpinner.start('Scanning codebase...');

  let files: string[];
  try {
    files = await discoverFiles(cwd);
    scanSpinner.stop(`Found ${files.length} source files`);
  } catch (error) {
    scanSpinner.stop('Failed to scan codebase');
    p.log.error(String(error));
    process.exit(1);
  }

  if (files.length === 0) {
    p.log.error('No source files found. Is this a code project?');
    process.exit(1);
  }

  // Phase 3: Run analyzers
  const analyzeSpinner = p.spinner();
  analyzeSpinner.start('Analyzing codebase...');

  let results;
  try {
    results = await runAnalyzers(cwd, files, {
      onProgress: (progress) => {
        if (progress.status === 'started') {
          analyzeSpinner.message(`Analyzing ${progress.artifact}...`);
        }
      },
    });
    analyzeSpinner.stop('Analysis complete');
  } catch (error) {
    analyzeSpinner.stop('Analysis failed');
    p.log.error(String(error));
    process.exit(1);
  }

  // Phase 4: Write artifacts
  const writeSpinner = p.spinner();
  writeSpinner.start('Writing artifacts...');

  const dontreadmeExisted = existsSync(dontreadmePath);

  try {
    ensureDontreadmeDir(cwd);
    const pkg = await getVersion();
    writeAllArtifacts({ cwd, results, files, version: pkg });
    writeSpinner.stop('Artifacts written to .dontreadme/');
  } catch (error) {
    writeSpinner.stop('Failed to write artifacts');

    // Rollback
    if (!dontreadmeExisted && existsSync(dontreadmePath)) {
      try {
        rmSync(dontreadmePath, { recursive: true, force: true });
        p.log.info('Rolled back: removed .dontreadme/');
      } catch { /* ignore */ }
    }

    p.log.error(String(error));
    process.exit(1);
  }

  // Phase 5: Bridge files
  const bridgeSummary = getBridgeSummary(cwd);
  if (bridgeSummary.length > 0) {
    p.log.message('');
    p.log.message(chalk.bold('Detected AI tool configs:'));
    for (const item of bridgeSummary) {
      p.log.message(`  ${chalk.cyan(item.tool)} - ${item.file} (${item.action})`);
    }

    const shouldInject = await p.confirm({
      message: 'Add codebase context pointers to these files?',
      initialValue: true,
    });

    if (p.isCancel(shouldInject)) {
      p.cancel('Skipped bridge file injection.');
    } else if (shouldInject) {
      for (const item of bridgeSummary) {
        const fullPath = join(cwd, item.file);
        injectBridgeBlock(fullPath);
        p.log.success(`Updated ${item.file}`);
      }
    }
  }

  // Phase 6: Update .gitignore
  const gitignorePath = join(cwd, '.gitignore');
  if (existsSync(gitignorePath)) {
    const { readFileSync, writeFileSync } = await import('fs');
    const gitignore = readFileSync(gitignorePath, 'utf-8');
    if (!gitignore.includes('.dontreadme/')) {
      // Don't ignore .dontreadme - it should be committed
      // But some artifacts may be non-deterministic
    }
  }

  // Done
  p.outro(chalk.green('dontreadme initialized!'));

  const arch = results.architecture.data;
  const api = results['api-surface'].data;

  console.log();
  console.log(chalk.dim('  Generated artifacts:'));
  console.log(chalk.dim(`  - ${arch.components.length} components in architecture`));
  console.log(chalk.dim(`  - ${api.routes.length} routes, ${api.exports.length} exports in api-surface`));
  console.log(chalk.dim(`  - ${results.decisions.data.decisions.length} decisions from git history`));
  console.log(chalk.dim(`  - ${results.hotspots.data.hotspots.filter(h => h.isHot).length} hotspot files detected`));
  console.log(chalk.dim(`  - ${results['risk-profile'].data.summary.critical + results['risk-profile'].data.summary.high} high-risk files`));
  console.log();
  console.log(chalk.dim('  Next steps:'));
  console.log(chalk.dim('  1. Review ') + chalk.cyan('.dontreadme/'));
  console.log(chalk.dim('  2. Run ') + chalk.cyan('dontreadme') + chalk.dim(' to open the TUI viewer'));
  console.log(chalk.dim('  3. Run ') + chalk.cyan('dontreadme generate') + chalk.dim(' to regenerate'));
  console.log();
}

async function getVersion(): Promise<string> {
  try {
    const { readFileSync } = await import('fs');
    const { join, dirname } = await import('path');
    const { fileURLToPath } = await import('url');
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const pkg = JSON.parse(readFileSync(join(__dirname, '../../../package.json'), 'utf-8'));
    return pkg.version || '0.1.0';
  } catch {
    return '0.1.0';
  }
}

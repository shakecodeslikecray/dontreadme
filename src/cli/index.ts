import { Command } from 'commander';
import chalk from 'chalk';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initCommand } from './commands/init.js';
import { generateCommand } from './commands/generate.js';
import { validateCommand } from './commands/validate.js';
import { diffCommand } from './commands/diff.js';
import { watchCommand } from './commands/watch.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let version = '0.1.0';
try {
  const pkg = JSON.parse(readFileSync(join(__dirname, '../../package.json'), 'utf-8'));
  version = pkg.version || version;
} catch { /* use default */ }

const program = new Command();

program
  .name('dontreadme')
  .description('Machine-readable codebase context for AI tools')
  .version(version);

// ─────────────────────────────────────────────────────────────
// init - Interactive setup + first generation
// ─────────────────────────────────────────────────────────────
program
  .command('init')
  .description('Initialize .dontreadme/ for this project')
  .option('--force', 'Overwrite existing .dontreadme/', false)
  .action(initCommand);

// ─────────────────────────────────────────────────────────────
// generate - Regenerate artifacts
// ─────────────────────────────────────────────────────────────
program
  .command('generate')
  .description('Regenerate all artifacts (or specific ones with --only)')
  .option('--only <artifacts>', 'Comma-separated list: arch,api,deps,decisions,hotspots,risk,understanding,contracts')
  .action(generateCommand);

// ─────────────────────────────────────────────────────────────
// diff - Show changes since last generation
// ─────────────────────────────────────────────────────────────
program
  .command('diff')
  .description('Show changes since last generation')
  .action(diffCommand);

// ─────────────────────────────────────────────────────────────
// watch - Auto-regenerate on file changes
// ─────────────────────────────────────────────────────────────
program
  .command('watch')
  .description('Auto-regenerate on file changes (2s debounce)')
  .action(watchCommand);

// ─────────────────────────────────────────────────────────────
// validate - Validate artifacts against schemas
// ─────────────────────────────────────────────────────────────
program
  .command('validate')
  .description('Validate .dontreadme/ artifacts against schemas')
  .action(validateCommand);

// ─────────────────────────────────────────────────────────────
// Default: Launch TUI
// ─────────────────────────────────────────────────────────────
if (process.argv.length === 2) {
  // No command provided - launch TUI
  const dontreadmePath = join(process.cwd(), '.dontreadme');
  if (!existsSync(dontreadmePath)) {
    console.log(chalk.yellow('No .dontreadme/ found. Running init first...\n'));
    initCommand({ force: false }).catch((error) => {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    });
  } else {
    import('../tui/index.js').catch((error) => {
      console.error(chalk.red('Error launching TUI:'), error.message);
      process.exit(1);
    });
  }
} else {
  program.parse();
}

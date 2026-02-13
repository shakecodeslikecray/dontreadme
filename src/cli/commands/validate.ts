import * as p from '@clack/prompts';
import chalk from 'chalk';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import {
  ManifestSchema,
  ArchitectureSchema,
  DependencyGraphSchema,
  ApiSurfaceSchema,
  DecisionsSchema,
  HotspotsSchema,
  RiskProfileSchema,
} from '../../types.js';
import { isInitialized, getDontreadmePath } from '../../core/config.js';

interface ValidationResult {
  file: string;
  valid: boolean;
  errors: string[];
}

const SCHEMA_MAP: Array<{ file: string; schema: any; name: string }> = [
  { file: 'manifest.json', schema: ManifestSchema, name: 'Manifest' },
  { file: 'architecture.json', schema: ArchitectureSchema, name: 'Architecture' },
  { file: 'dependency-graph.json', schema: DependencyGraphSchema, name: 'Dependency Graph' },
  { file: 'api-surface.json', schema: ApiSurfaceSchema, name: 'API Surface' },
  { file: 'decisions/index.json', schema: DecisionsSchema, name: 'Decisions' },
  { file: 'hotspots.json', schema: HotspotsSchema, name: 'Hotspots' },
  { file: 'risk-profile.json', schema: RiskProfileSchema, name: 'Risk Profile' },
];

export async function validateCommand(): Promise<void> {
  const cwd = process.cwd();

  if (!isInitialized(cwd)) {
    p.log.error('Not initialized. Run `dontreadme init` first.');
    process.exit(1);
  }

  p.intro(chalk.bold('dontreadme') + chalk.dim(' - validate'));

  const dontreadmePath = getDontreadmePath(cwd);
  const results: ValidationResult[] = [];
  let hasErrors = false;

  for (const { file, schema, name } of SCHEMA_MAP) {
    const fullPath = join(dontreadmePath, file);

    if (!existsSync(fullPath)) {
      results.push({ file, valid: false, errors: ['File not found'] });
      hasErrors = true;
      continue;
    }

    try {
      const content = JSON.parse(readFileSync(fullPath, 'utf-8'));
      const result = schema.safeParse(content);

      if (result.success) {
        results.push({ file, valid: true, errors: [] });
      } else {
        const errors = result.error.issues.map(
          (issue: any) => `${issue.path.join('.')}: ${issue.message}`,
        );
        results.push({ file, valid: false, errors });
        hasErrors = true;
      }
    } catch (error) {
      results.push({ file, valid: false, errors: [`Parse error: ${error}`] });
      hasErrors = true;
    }
  }

  // Check non-JSON files exist
  for (const file of ['understanding.md', 'contracts/intent.yml', 'README.md']) {
    const fullPath = join(dontreadmePath, file);
    if (!existsSync(fullPath)) {
      results.push({ file, valid: false, errors: ['File not found'] });
      hasErrors = true;
    } else {
      results.push({ file, valid: true, errors: [] });
    }
  }

  // Display results
  for (const result of results) {
    if (result.valid) {
      p.log.success(`${chalk.green('\u2713')} ${result.file}`);
    } else {
      p.log.error(`${chalk.red('\u2717')} ${result.file}`);
      for (const error of result.errors) {
        p.log.message(`    ${chalk.dim(error)}`);
      }
    }
  }

  const validCount = results.filter((r) => r.valid).length;
  const totalCount = results.length;

  if (hasErrors) {
    p.outro(chalk.red(`Validation failed: ${validCount}/${totalCount} valid`));
    process.exit(1);
  } else {
    p.outro(chalk.green(`All ${totalCount} artifacts valid`));
  }
}

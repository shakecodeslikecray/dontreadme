import fg from 'fast-glob';
import { readFileSync } from 'fs';
import { join } from 'path';

const DEFAULT_INCLUDE = ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'];
const DEFAULT_EXCLUDE = [
  'node_modules/**',
  'dist/**',
  'build/**',
  '.next/**',
  'coverage/**',
  '**/*.test.*',
  '**/*.spec.*',
  '**/*.d.ts',
  '**/*.min.js',
  '**/*.bundle.js',
  '.dontreadme/**',
];

export interface DiscoveredFile {
  path: string;
  relativePath: string;
  content: string;
  lines: number;
}

/**
 * Scan codebase for source files using fast-glob.
 */
export async function discoverFiles(
  cwd: string,
  include: string[] = DEFAULT_INCLUDE,
  exclude: string[] = DEFAULT_EXCLUDE,
): Promise<string[]> {
  const files = await fg(include, {
    cwd,
    ignore: exclude,
    absolute: false,
    dot: false,
    onlyFiles: true,
  });

  return files.sort();
}

/**
 * Read file contents for analysis. Skips files that are too large (>100KB).
 */
export function readSourceFile(cwd: string, relativePath: string): DiscoveredFile | null {
  try {
    const fullPath = join(cwd, relativePath);
    const content = readFileSync(fullPath, 'utf-8');

    // Skip very large files
    if (content.length > 100_000) return null;

    return {
      path: fullPath,
      relativePath,
      content,
      lines: content.split('\n').length,
    };
  } catch {
    return null;
  }
}

/**
 * Detect the primary framework from package.json.
 */
export function detectFramework(cwd: string): string | null {
  try {
    const pkg = JSON.parse(readFileSync(join(cwd, 'package.json'), 'utf-8'));
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };

    if (allDeps['next']) return 'next';
    if (allDeps['nuxt']) return 'nuxt';
    if (allDeps['@angular/core']) return 'angular';
    if (allDeps['svelte'] || allDeps['@sveltejs/kit']) return 'svelte';
    if (allDeps['express']) return 'express';
    if (allDeps['fastify']) return 'fastify';
    if (allDeps['hono']) return 'hono';
    if (allDeps['koa']) return 'koa';
    if (allDeps['react'] && !allDeps['next']) return 'react';
    if (allDeps['vue'] && !allDeps['nuxt']) return 'vue';

    return null;
  } catch {
    return null;
  }
}

/**
 * Detect the primary language from file extensions.
 */
export function detectLanguage(files: string[]): string {
  const counts: Record<string, number> = {};
  for (const file of files) {
    const ext = file.split('.').pop() || '';
    counts[ext] = (counts[ext] || 0) + 1;
  }

  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const top = sorted[0]?.[0];

  if (top === 'ts' || top === 'tsx') return 'TypeScript';
  if (top === 'js' || top === 'jsx') return 'JavaScript';
  if (top === 'py') return 'Python';
  if (top === 'go') return 'Go';
  if (top === 'rs') return 'Rust';
  if (top === 'java') return 'Java';
  return top || 'Unknown';
}

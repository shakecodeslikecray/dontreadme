import { createHash } from 'crypto';

/**
 * Deterministic JSON stringify: sorted keys, consistent formatting.
 * Ensures regeneration produces identical output for git diffs.
 */
export function stableStringify(value: unknown, indent = 2): string {
  return JSON.stringify(value, sortedReplacer, indent) + '\n';
}

function sortedReplacer(_key: string, value: unknown): unknown {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const sorted: Record<string, unknown> = {};
    for (const k of Object.keys(value).sort()) {
      sorted[k] = (value as Record<string, unknown>)[k];
    }
    return sorted;
  }
  return value;
}

/**
 * Hash content for manifest tracking.
 */
export function hashContent(content: string): string {
  return createHash('sha256').update(content).digest('hex').slice(0, 12);
}

/**
 * Normalize a file path to forward slashes, relative from root.
 */
export function normalizePath(filePath: string, root: string): string {
  const relative = filePath.startsWith(root)
    ? filePath.slice(root.length)
    : filePath;
  return relative.replace(/\\/g, '/').replace(/^\//, '');
}

/**
 * Sort an array of strings for deterministic output.
 */
export function sortedUnique(arr: string[]): string[] {
  return [...new Set(arr)].sort();
}

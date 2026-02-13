import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { DependencyGraph, DependencyNode, AnalyzerResult } from '../types.js';
import { sortedUnique } from '../core/utils.js';

const IMPORT_REGEX = /import\s+(?:(?:[\w*{}\s,]+)\s+from\s+)?['"](\.{1,2}\/[^'"]+)['"]/g;
const REQUIRE_REGEX = /require\(['"](\.{1,2}\/[^'"]+)['"]\)/g;
const REEXPORT_REGEX = /export\s+(?:\{[^}]+\}|\*)\s+from\s+['"](\.{1,2}\/[^'"]+)['"]/g;

function resolveImport(fromFile: string, importPath: string, allFiles: Set<string>): string | null {
  const dir = dirname(fromFile);
  let resolved = join(dir, importPath).replace(/\\/g, '/');

  // Try exact match first
  if (allFiles.has(resolved)) return resolved;

  // Try with extensions
  for (const ext of ['.ts', '.tsx', '.js', '.jsx']) {
    if (allFiles.has(resolved + ext)) return resolved + ext;
  }

  // Try as directory with index
  for (const ext of ['.ts', '.tsx', '.js', '.jsx']) {
    if (allFiles.has(resolved + '/index' + ext)) return resolved + '/index' + ext;
  }

  // Return normalized path even if not found (external or unresolved)
  return null;
}

export async function analyzeDependencyGraph(cwd: string, files: string[]): Promise<AnalyzerResult<DependencyGraph>> {
  const allFiles = new Set(files);
  const imports = new Map<string, string[]>();
  const importedBy = new Map<string, string[]>();

  // Initialize
  for (const file of files) {
    imports.set(file, []);
    importedBy.set(file, []);
  }

  // Parse imports for each file
  for (const file of files) {
    try {
      const content = readFileSync(join(cwd, file), 'utf-8');
      const fileImports: string[] = [];

      for (const regex of [IMPORT_REGEX, REQUIRE_REGEX, REEXPORT_REGEX]) {
        const r = new RegExp(regex.source, 'g');
        let match;
        while ((match = r.exec(content)) !== null) {
          const resolved = resolveImport(file, match[1], allFiles);
          if (resolved) {
            fileImports.push(resolved);
          }
        }
      }

      const unique = sortedUnique(fileImports);
      imports.set(file, unique);

      // Build reverse index
      for (const imp of unique) {
        const existing = importedBy.get(imp) || [];
        existing.push(file);
        importedBy.set(imp, existing);
      }
    } catch {
      // Skip files that can't be read
    }
  }

  // Build nodes
  const nodes: DependencyNode[] = files.map((file) => {
    const fileImports = imports.get(file) || [];
    const fileImportedBy = sortedUnique(importedBy.get(file) || []);
    return {
      file,
      imports: fileImports,
      importedBy: fileImportedBy,
      inDegree: fileImportedBy.length,
      outDegree: fileImports.length,
    };
  }).sort((a, b) => a.file.localeCompare(b.file));

  // Detect circular dependencies
  const circularDeps = detectCircularDeps(imports);

  // Find hubs (most imported files)
  const hubThreshold = 5;
  const hubs = nodes
    .filter((n) => n.inDegree >= hubThreshold)
    .sort((a, b) => b.inDegree - a.inDegree)
    .map((n) => n.file);

  // Find entrypoints (zero in-degree)
  const entrypoints = nodes
    .filter((n) => n.inDegree === 0)
    .map((n) => n.file);

  // Count total edges
  const totalEdges = nodes.reduce((sum, n) => sum + n.outDegree, 0);

  return {
    name: 'dependency-graph',
    data: {
      nodes,
      circularDeps,
      hubs,
      entrypoints,
      totalFiles: files.length,
      totalEdges,
    },
    deterministic: true,
  };
}

function detectCircularDeps(imports: Map<string, string[]>): string[][] {
  const circular: string[][] = [];
  const visited = new Set<string>();
  const inStack = new Set<string>();
  const path: string[] = [];

  function dfs(file: string): void {
    if (inStack.has(file)) {
      // Found a cycle
      const cycleStart = path.indexOf(file);
      if (cycleStart !== -1) {
        const cycle = path.slice(cycleStart).concat(file).sort();
        // Deduplicate cycles by sorting and checking
        const cycleKey = cycle.join('->');
        if (!circular.some((c) => c.sort().join('->') === cycleKey)) {
          circular.push(cycle);
        }
      }
      return;
    }

    if (visited.has(file)) return;

    visited.add(file);
    inStack.add(file);
    path.push(file);

    for (const dep of imports.get(file) || []) {
      dfs(dep);
    }

    path.pop();
    inStack.delete(file);
  }

  for (const file of [...imports.keys()].sort()) {
    dfs(file);
  }

  return circular.sort((a, b) => a[0].localeCompare(b[0]));
}

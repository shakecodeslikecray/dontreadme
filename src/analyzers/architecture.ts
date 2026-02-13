import { readFileSync } from 'fs';
import { join, dirname, basename, relative } from 'path';
import { Architecture, ArchitectureComponent, ArchitectureEdge, ArchitectureLayer, AnalyzerResult } from '../types.js';
import { sortedUnique } from '../core/utils.js';

// Regex patterns for import/export parsing (fallback when TS compiler not available)
const IMPORT_REGEX = /import\s+(?:(?:[\w*{}\s,]+)\s+from\s+)?['"](\.{1,2}\/[^'"]+)['"]/g;
const EXPORT_REGEX = /export\s+(?:default\s+)?(?:function|class|const|let|var|interface|type|enum)\s+(\w+)/g;
const REEXPORT_REGEX = /export\s+(?:\{[^}]+\}|\*)\s+from\s+['"](\.{1,2}\/[^'"]+)['"]/g;

interface FileAnalysis {
  relativePath: string;
  imports: string[];
  exports: string[];
  directory: string;
}

function classifyComponent(dirPath: string, files: string[]): ArchitectureComponent['type'] {
  const dir = dirPath.toLowerCase();
  if (dir.includes('test') || dir.includes('__test')) return 'test';
  if (dir.includes('config') || dir.includes('env')) return 'config';
  if (dir.includes('util') || dir.includes('helper') || dir.includes('lib')) return 'utility';
  if (dir.includes('service') || dir.includes('provider')) return 'service';
  if (dir.includes('component') || dir.includes('ui') || dir.includes('view')) return 'component';

  // Check for entrypoints
  const hasIndex = files.some((f) => basename(f).startsWith('index.'));
  const isRoot = dirPath === '.' || dirPath === 'src';
  if (isRoot && hasIndex) return 'entrypoint';

  return 'module';
}

function resolveImportPath(fromFile: string, importPath: string): string {
  const dir = dirname(fromFile);
  let resolved = join(dir, importPath).replace(/\\/g, '/');

  // Remove file extensions for normalization
  resolved = resolved.replace(/\.(ts|tsx|js|jsx)$/, '');
  // Remove /index suffix
  resolved = resolved.replace(/\/index$/, '');

  return resolved;
}

function analyzeFile(cwd: string, relativePath: string): FileAnalysis | null {
  try {
    const content = readFileSync(join(cwd, relativePath), 'utf-8');
    const imports: string[] = [];
    const exports: string[] = [];

    // Parse imports
    let match;
    const importRegex = new RegExp(IMPORT_REGEX.source, 'g');
    while ((match = importRegex.exec(content)) !== null) {
      const importPath = resolveImportPath(relativePath, match[1]);
      imports.push(importPath);
    }

    // Parse re-exports
    const reexportRegex = new RegExp(REEXPORT_REGEX.source, 'g');
    while ((match = reexportRegex.exec(content)) !== null) {
      const importPath = resolveImportPath(relativePath, match[1]);
      imports.push(importPath);
    }

    // Parse exports
    const exportRegex = new RegExp(EXPORT_REGEX.source, 'g');
    while ((match = exportRegex.exec(content)) !== null) {
      exports.push(match[1]);
    }

    return {
      relativePath,
      imports: sortedUnique(imports),
      exports: sortedUnique(exports),
      directory: dirname(relativePath),
    };
  } catch {
    return null;
  }
}

export async function analyzeArchitecture(cwd: string, files: string[]): Promise<AnalyzerResult<Architecture>> {
  // Analyze each file
  const analyses: FileAnalysis[] = [];
  for (const file of files) {
    const analysis = analyzeFile(cwd, file);
    if (analysis) analyses.push(analysis);
  }

  // Group files by directory into components
  const dirGroups = new Map<string, FileAnalysis[]>();
  for (const analysis of analyses) {
    const dir = analysis.directory || '.';
    const existing = dirGroups.get(dir) || [];
    existing.push(analysis);
    dirGroups.set(dir, existing);
  }

  // Build components
  const components: ArchitectureComponent[] = [];
  for (const [dir, dirFiles] of [...dirGroups.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const allExports = sortedUnique(dirFiles.flatMap((f) => f.exports));
    const allImports = sortedUnique(dirFiles.flatMap((f) => f.imports));
    const filePaths = dirFiles.map((f) => f.relativePath).sort();

    components.push({
      name: dir === '.' ? 'root' : dir.replace(/\//g, '.'),
      path: dir,
      files: filePaths,
      type: classifyComponent(dir, filePaths),
      exports: allExports,
      imports: allImports,
    });
  }

  // Build edges (component-to-component dependencies)
  const edges: ArchitectureEdge[] = [];
  const componentByDir = new Map(components.map((c) => [c.path, c]));

  for (const component of components) {
    // Collect all imports from this component's files
    const importTargetDirs = new Map<string, string[]>();

    for (const analysis of dirGroups.get(component.path) || []) {
      for (const importPath of analysis.imports) {
        // Find which component this import targets
        const importDir = dirname(importPath);
        const normalizedDir = importDir === '.' ? '.' : importDir;

        // Check if target directory is a known component
        let targetDir = normalizedDir;
        if (!componentByDir.has(targetDir)) {
          // Try parent directories
          const parts = normalizedDir.split('/');
          while (parts.length > 0) {
            const candidate = parts.join('/');
            if (componentByDir.has(candidate)) {
              targetDir = candidate;
              break;
            }
            parts.pop();
          }
        }

        if (targetDir !== component.path && componentByDir.has(targetDir)) {
          const existing = importTargetDirs.get(targetDir) || [];
          existing.push(importPath);
          importTargetDirs.set(targetDir, existing);
        }
      }
    }

    for (const [targetDir, imports] of [...importTargetDirs.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
      const targetComponent = componentByDir.get(targetDir);
      if (targetComponent) {
        edges.push({
          from: component.name,
          to: targetComponent.name,
          imports: sortedUnique(imports),
        });
      }
    }
  }

  // Detect layers by dependency direction
  const layers = detectLayers(components, edges);

  // Find entrypoints (zero in-degree at component level)
  const targetNames = new Set(edges.map((e) => e.to));
  const entrypoints = components
    .filter((c) => !targetNames.has(c.name))
    .map((c) => c.name)
    .sort();

  return {
    name: 'architecture',
    data: {
      components,
      edges,
      layers,
      entrypoints,
    },
    deterministic: true,
  };
}

function detectLayers(components: ArchitectureComponent[], edges: ArchitectureEdge[]): ArchitectureLayer[] {
  // Build in-degree map
  const inDegree = new Map<string, number>();
  const dependents = new Map<string, Set<string>>();

  for (const c of components) {
    inDegree.set(c.name, 0);
    dependents.set(c.name, new Set());
  }

  for (const edge of edges) {
    inDegree.set(edge.to, (inDegree.get(edge.to) || 0) + 1);
    dependents.get(edge.from)?.add(edge.to);
  }

  // Topological sort into layers
  const layers: ArchitectureLayer[] = [];
  const remaining = new Set(components.map((c) => c.name));
  let level = 0;

  while (remaining.size > 0) {
    const currentLayer = [...remaining].filter((name) => {
      const deps = dependents.get(name) || new Set();
      return [...deps].every((d) => !remaining.has(d) || d === name);
    }).sort();

    if (currentLayer.length === 0) {
      // Circular dependency - add all remaining to current layer
      layers.push({
        name: `layer-${level}`,
        components: [...remaining].sort(),
        level,
      });
      break;
    }

    layers.push({
      name: `layer-${level}`,
      components: currentLayer,
      level,
    });

    for (const name of currentLayer) {
      remaining.delete(name);
    }
    level++;
  }

  return layers;
}

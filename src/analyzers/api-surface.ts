import { readFileSync } from 'fs';
import { join } from 'path';
import { ApiSurface, ApiRoute, ExportedSymbol, AnalyzerResult } from '../types.js';
import { detectFramework } from '../core/file-discovery.js';
import { sortedUnique } from '../core/utils.js';

// Route pattern matchers per framework
const EXPRESS_ROUTE_REGEX = /(?:app|router)\.(get|post|put|patch|delete|all|use)\s*\(\s*['"](\/[^'"]*)['"]/g;
const NEXT_APP_ROUTE_REGEX = /export\s+(?:async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s*\(/g;
const HONO_ROUTE_REGEX = /(?:app|router)\.(get|post|put|patch|delete|all)\s*\(\s*['"](\/[^'"]*)['"]/g;

// Export pattern matchers
const EXPORT_FUNCTION_REGEX = /export\s+(?:async\s+)?function\s+(\w+)/g;
const EXPORT_CLASS_REGEX = /export\s+class\s+(\w+)/g;
const EXPORT_CONST_REGEX = /export\s+const\s+(\w+)/g;
const EXPORT_TYPE_REGEX = /export\s+type\s+(\w+)/g;
const EXPORT_INTERFACE_REGEX = /export\s+interface\s+(\w+)/g;
const EXPORT_ENUM_REGEX = /export\s+enum\s+(\w+)/g;
const EXPORT_DEFAULT_REGEX = /export\s+default\s+(?:function|class)\s+(\w+)/g;

function extractRoutes(content: string, file: string, framework: string | null): ApiRoute[] {
  const routes: ApiRoute[] = [];

  if (framework === 'next') {
    // Next.js App Router: route handlers in route.ts files
    if (file.includes('route.') || file.includes('api/')) {
      const regex = new RegExp(NEXT_APP_ROUTE_REGEX.source, 'g');
      let match;
      while ((match = regex.exec(content)) !== null) {
        // Derive path from file path: app/api/users/route.ts -> /api/users
        const routePath = '/' + file
          .replace(/^(src\/)?app\//, '')
          .replace(/\/route\.(ts|js)$/, '')
          .replace(/\[([^\]]+)\]/g, ':$1');

        routes.push({
          method: match[1].toUpperCase(),
          path: routePath,
          file,
          handler: match[1],
        });
      }
    }

    // Next.js pages: page.tsx files
    if (file.includes('page.')) {
      const routePath = '/' + file
        .replace(/^(src\/)?app\//, '')
        .replace(/\/page\.(tsx|ts|jsx|js)$/, '')
        .replace(/\[([^\]]+)\]/g, ':$1');

      routes.push({
        method: 'GET',
        path: routePath || '/',
        file,
        handler: 'Page',
      });
    }
  }

  // Express / Hono / Fastify style routes
  if (framework === 'express' || framework === 'hono' || framework === 'fastify' || !framework) {
    const regex = new RegExp(EXPRESS_ROUTE_REGEX.source, 'g');
    let match;
    const lines = content.split('\n');
    while ((match = regex.exec(content)) !== null) {
      const line = content.slice(0, match.index).split('\n').length;
      routes.push({
        method: match[1].toUpperCase(),
        path: match[2],
        file,
        line,
      });
    }
  }

  return routes;
}

function extractExports(content: string, file: string): ExportedSymbol[] {
  const exports: ExportedSymbol[] = [];
  const lines = content.split('\n');

  const patterns: Array<{ regex: RegExp; type: ExportedSymbol['type'] }> = [
    { regex: EXPORT_FUNCTION_REGEX, type: 'function' },
    { regex: EXPORT_CLASS_REGEX, type: 'class' },
    { regex: EXPORT_CONST_REGEX, type: 'const' },
    { regex: EXPORT_TYPE_REGEX, type: 'type' },
    { regex: EXPORT_INTERFACE_REGEX, type: 'interface' },
    { regex: EXPORT_ENUM_REGEX, type: 'enum' },
    { regex: EXPORT_DEFAULT_REGEX, type: 'default' },
  ];

  for (const { regex, type } of patterns) {
    const r = new RegExp(regex.source, 'g');
    let match;
    while ((match = r.exec(content)) !== null) {
      const line = content.slice(0, match.index).split('\n').length;
      exports.push({
        name: match[1],
        type,
        file,
        line,
      });
    }
  }

  return exports;
}

export async function analyzeApiSurface(cwd: string, files: string[]): Promise<AnalyzerResult<ApiSurface>> {
  const framework = detectFramework(cwd);
  const allRoutes: ApiRoute[] = [];
  const allExports: ExportedSymbol[] = [];

  for (const file of files) {
    try {
      const content = readFileSync(join(cwd, file), 'utf-8');

      // Extract routes
      const routes = extractRoutes(content, file, framework);
      allRoutes.push(...routes);

      // Extract exports (only from index files and public API files)
      const isPublicApi = file.includes('index.') ||
        file.includes('/api/') ||
        file.includes('/routes/') ||
        file.includes('/handlers/');

      if (isPublicApi) {
        const exports = extractExports(content, file);
        allExports.push(...exports);
      }
    } catch {
      // Skip files that can't be read
    }
  }

  // Sort routes and exports for deterministic output
  allRoutes.sort((a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method));
  allExports.sort((a, b) => a.file.localeCompare(b.file) || a.name.localeCompare(b.name));

  // Endpoints = routes (separate field for backwards compatibility)
  return {
    name: 'api-surface',
    data: {
      framework,
      routes: allRoutes,
      exports: allExports,
      endpoints: allRoutes,
    },
    deterministic: true,
  };
}

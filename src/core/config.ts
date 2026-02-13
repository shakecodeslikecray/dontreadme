import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { Manifest, ManifestSchema, DontreadmeConfig, DontreadmeConfigSchema } from '../types.js';
import { stableStringify } from './utils.js';

const DONTREADME_DIR = '.dontreadme';
const MANIFEST_FILE = 'manifest.json';

export function getDontreadmePath(cwd: string): string {
  return join(cwd, DONTREADME_DIR);
}

export function getManifestPath(cwd: string): string {
  return join(getDontreadmePath(cwd), MANIFEST_FILE);
}

export function isInitialized(cwd: string): boolean {
  return existsSync(getManifestPath(cwd));
}

export function loadManifest(cwd: string): Manifest | null {
  const path = getManifestPath(cwd);
  if (!existsSync(path)) return null;

  const raw = JSON.parse(readFileSync(path, 'utf-8'));
  const result = ManifestSchema.safeParse(raw);
  return result.success ? result.data : null;
}

export function saveManifest(cwd: string, manifest: Manifest): void {
  const dir = getDontreadmePath(cwd);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(join(dir, MANIFEST_FILE), stableStringify(manifest), 'utf-8');
}

export function ensureDontreadmeDir(cwd: string): string {
  const dir = getDontreadmePath(cwd);
  mkdirSync(join(dir, 'contracts'), { recursive: true });
  mkdirSync(join(dir, 'decisions'), { recursive: true });
  return dir;
}

export function loadConfig(cwd: string): DontreadmeConfig {
  const manifest = loadManifest(cwd);
  if (!manifest) {
    return DontreadmeConfigSchema.parse({ version: '1' });
  }
  // Config is embedded in the generation process, return defaults
  return DontreadmeConfigSchema.parse({ version: '1' });
}

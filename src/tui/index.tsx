import React from 'react';
import { render } from 'ink';
import { readFileSync, existsSync } from 'fs';
import { join, basename, dirname } from 'path';
import { fileURLToPath } from 'url';
import { App } from './App.js';
import { loadManifest } from '../core/config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const cwd = process.cwd();
const projectName = basename(cwd);

let version = '0.1.0';
try {
  const pkg = JSON.parse(readFileSync(join(__dirname, '../../package.json'), 'utf-8'));
  version = pkg.version || version;
} catch { /* use default */ }

const manifest = loadManifest(cwd);
const lastGenerated = manifest
  ? new Date(manifest.generatedAt).toLocaleString()
  : 'never';

const { waitUntilExit } = render(
  <App
    cwd={cwd}
    version={version}
    projectName={projectName}
    lastGenerated={lastGenerated}
  />,
  { exitOnCtrlC: true },
);

await waitUntilExit();

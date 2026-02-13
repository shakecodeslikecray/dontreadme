import { execa } from 'execa';
import { existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { ProviderType } from '../types.js';

interface ProviderCheck {
  name: ProviderType;
  command: string;
  args: string[];
  paths?: string[];
}

const providerChecks: ProviderCheck[] = [
  {
    name: 'claude-code',
    command: 'claude',
    args: ['--version'],
    paths: [
      join(homedir(), '.local', 'bin', 'claude'),
      '/usr/local/bin/claude',
      '/opt/homebrew/bin/claude',
    ],
  },
  {
    name: 'aider',
    command: 'aider',
    args: ['--version'],
    paths: [
      join(homedir(), '.local', 'bin', 'aider'),
      '/usr/local/bin/aider',
      '/opt/homebrew/bin/aider',
    ],
  },
  {
    name: 'codex',
    command: 'codex',
    args: ['--version'],
    paths: [
      join(homedir(), '.local', 'bin', 'codex'),
      '/usr/local/bin/codex',
      '/opt/homebrew/bin/codex',
    ],
  },
  {
    name: 'opencode',
    command: 'opencode',
    args: ['--version'],
    paths: [
      join(homedir(), '.local', 'bin', 'opencode'),
      '/usr/local/bin/opencode',
      '/opt/homebrew/bin/opencode',
    ],
  },
  {
    name: 'gemini',
    command: 'gemini',
    args: ['--version'],
    paths: [
      join(homedir(), '.local', 'bin', 'gemini'),
      '/usr/local/bin/gemini',
      '/opt/homebrew/bin/gemini',
    ],
  },
  {
    name: 'ollama',
    command: 'ollama',
    args: ['--version'],
    paths: [
      join(homedir(), '.local', 'bin', 'ollama'),
      '/usr/local/bin/ollama',
      '/opt/homebrew/bin/ollama',
    ],
  },
];

const resolvedPaths: Map<ProviderType, string> = new Map();

async function findCommand(check: ProviderCheck): Promise<string | null> {
  try {
    await execa(check.command, check.args, { timeout: 5000 });
    return check.command;
  } catch {
    // Not in PATH
  }

  if (check.paths) {
    for (const path of check.paths) {
      if (existsSync(path)) {
        try {
          await execa(path, check.args, { timeout: 5000 });
          return path;
        } catch {
          // Path exists but command failed
        }
      }
    }
  }

  return null;
}

export async function detectProvider(): Promise<ProviderType[]> {
  const available: ProviderType[] = [];
  for (const check of providerChecks) {
    const commandPath = await findCommand(check);
    if (commandPath) {
      resolvedPaths.set(check.name, commandPath);
      available.push(check.name);
    }
  }
  return available;
}

export async function isProviderAvailable(name: ProviderType): Promise<boolean> {
  const check = providerChecks.find((c) => c.name === name);
  if (!check) return false;
  const commandPath = await findCommand(check);
  if (commandPath) {
    resolvedPaths.set(name, commandPath);
    return true;
  }
  return false;
}

export function getProviderCommand(name: ProviderType): string {
  const cached = resolvedPaths.get(name);
  if (cached) return cached;
  const check = providerChecks.find((c) => c.name === name);
  return check?.command || name;
}

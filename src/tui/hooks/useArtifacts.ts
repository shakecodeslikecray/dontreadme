import { useState, useEffect } from 'react';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

export interface ArtifactEntry {
  name: string;
  path: string;
  isDir: boolean;
  children?: ArtifactEntry[];
  content?: string;
  type: 'json' | 'yaml' | 'markdown' | 'unknown';
}

function getFileType(name: string): ArtifactEntry['type'] {
  if (name.endsWith('.json')) return 'json';
  if (name.endsWith('.yml') || name.endsWith('.yaml')) return 'yaml';
  if (name.endsWith('.md')) return 'markdown';
  return 'unknown';
}

function loadArtifactContent(fullPath: string): string {
  try {
    return readFileSync(fullPath, 'utf-8');
  } catch {
    return '(unable to read file)';
  }
}

export function useArtifacts(cwd: string): {
  tree: ArtifactEntry[];
  flatList: ArtifactEntry[];
  reload: () => void;
} {
  const [tree, setTree] = useState<ArtifactEntry[]>([]);
  const [flatList, setFlatList] = useState<ArtifactEntry[]>([]);

  const load = () => {
    const dontreadmePath = join(cwd, '.dontreadme');
    if (!existsSync(dontreadmePath)) {
      setTree([]);
      setFlatList([]);
      return;
    }

    const entries: ArtifactEntry[] = [];
    const flat: ArtifactEntry[] = [];

    // Root files
    const rootFiles = [
      'manifest.json',
      'understanding.md',
      'architecture.json',
      'api-surface.json',
      'dependency-graph.json',
      'hotspots.json',
      'risk-profile.json',
    ];

    for (const file of rootFiles) {
      const fullPath = join(dontreadmePath, file);
      if (existsSync(fullPath)) {
        const entry: ArtifactEntry = {
          name: file.replace(/\.(json|md|yml|yaml)$/, ''),
          path: file,
          isDir: false,
          type: getFileType(file),
          content: loadArtifactContent(fullPath),
        };
        entries.push(entry);
        flat.push(entry);
      }
    }

    // contracts/
    const contractsDir = join(dontreadmePath, 'contracts');
    if (existsSync(contractsDir)) {
      const contractFiles = ['intent.yml'];
      const children: ArtifactEntry[] = [];
      for (const file of contractFiles) {
        const fullPath = join(contractsDir, file);
        if (existsSync(fullPath)) {
          const child: ArtifactEntry = {
            name: file.replace(/\.(json|md|yml|yaml)$/, ''),
            path: `contracts/${file}`,
            isDir: false,
            type: getFileType(file),
            content: loadArtifactContent(fullPath),
          };
          children.push(child);
          flat.push(child);
        }
      }
      if (children.length > 0) {
        entries.push({
          name: 'contracts',
          path: 'contracts/',
          isDir: true,
          children,
          type: 'unknown',
        });
      }
    }

    // decisions/
    const decisionsDir = join(dontreadmePath, 'decisions');
    if (existsSync(decisionsDir)) {
      const decisionFiles = ['index.json'];
      const children: ArtifactEntry[] = [];
      for (const file of decisionFiles) {
        const fullPath = join(decisionsDir, file);
        if (existsSync(fullPath)) {
          const child: ArtifactEntry = {
            name: file.replace(/\.(json|md|yml|yaml)$/, ''),
            path: `decisions/${file}`,
            isDir: false,
            type: getFileType(file),
            content: loadArtifactContent(fullPath),
          };
          children.push(child);
          flat.push(child);
        }
      }
      if (children.length > 0) {
        entries.push({
          name: 'decisions',
          path: 'decisions/',
          isDir: true,
          children,
          type: 'unknown',
        });
      }
    }

    setTree(entries);
    setFlatList(flat);
  };

  useEffect(() => { load(); }, [cwd]);

  return { tree, flatList, reload: load };
}

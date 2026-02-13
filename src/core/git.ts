import { execa } from 'execa';

export interface GitLogEntry {
  hash: string;
  author: string;
  date: string;
  message: string;
  files: string[];
}

export interface GitNumstatEntry {
  file: string;
  additions: number;
  deletions: number;
}

export interface GitFileFrequency {
  file: string;
  changeCount: number;
  authors: string[];
  lastModified: string;
}

/**
 * Check if the current directory is a git repository.
 */
export async function isGitRepo(cwd: string): Promise<boolean> {
  try {
    await execa('git', ['rev-parse', '--is-inside-work-tree'], { cwd });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get git log with file names.
 * Format: hash\0author\0date\0message, followed by file names.
 */
export async function getGitLog(cwd: string, limit = 500): Promise<GitLogEntry[]> {
  try {
    const { stdout } = await execa(
      'git',
      ['log', `--format=%H%x00%an%x00%ai%x00%s`, '--name-only', '-n', String(limit)],
      { cwd, timeout: 30000 },
    );

    if (!stdout.trim()) return [];

    const entries: GitLogEntry[] = [];
    const blocks = stdout.split('\n\n');

    for (const block of blocks) {
      const lines = block.split('\n').filter(Boolean);
      if (lines.length === 0) continue;

      const parts = lines[0].split('\0');
      if (parts.length < 4) continue;

      entries.push({
        hash: parts[0],
        author: parts[1],
        date: parts[2],
        message: parts[3],
        files: lines.slice(1).filter((f) => f.trim() && !f.includes('\0')),
      });
    }

    return entries;
  } catch {
    return [];
  }
}

/**
 * Get numstat (additions/deletions per file) from recent commits.
 */
export async function getGitNumstat(cwd: string, limit = 1000): Promise<Map<string, GitFileFrequency>> {
  const frequencies = new Map<string, GitFileFrequency>();

  try {
    const { stdout } = await execa(
      'git',
      ['log', '--numstat', '--format=%H%x00%an%x00%ai', '-n', String(limit)],
      { cwd, timeout: 30000 },
    );

    if (!stdout.trim()) return frequencies;

    let currentAuthor = '';
    let currentDate = '';

    for (const line of stdout.split('\n')) {
      if (!line.trim()) continue;

      // Header line: hash\0author\0date
      if (line.includes('\0')) {
        const parts = line.split('\0');
        currentAuthor = parts[1] || '';
        currentDate = parts[2] || '';
        continue;
      }

      // Numstat line: additions\tdeletions\tfile
      const match = line.match(/^(\d+|-)\t(\d+|-)\t(.+)$/);
      if (!match) continue;

      const file = match[3];
      const existing = frequencies.get(file);

      if (existing) {
        existing.changeCount++;
        if (!existing.authors.includes(currentAuthor)) {
          existing.authors.push(currentAuthor);
        }
        if (currentDate > existing.lastModified) {
          existing.lastModified = currentDate;
        }
      } else {
        frequencies.set(file, {
          file,
          changeCount: 1,
          authors: [currentAuthor],
          lastModified: currentDate,
        });
      }
    }
  } catch {
    // Not a git repo or git error - return empty
  }

  return frequencies;
}

/**
 * Get the short log (author commit counts per file).
 */
export async function getAuthorCountPerFile(cwd: string, file: string): Promise<number> {
  try {
    const { stdout } = await execa(
      'git',
      ['shortlog', '-sn', '--', file],
      { cwd, timeout: 10000 },
    );
    return stdout.split('\n').filter(Boolean).length;
  } catch {
    return 1;
  }
}

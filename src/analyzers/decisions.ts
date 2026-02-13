import { Decisions, Decision, DecisionCommit, AnalyzerResult } from '../types.js';
import { getGitLog, GitLogEntry } from '../core/git.js';
import { sortedUnique } from '../core/utils.js';

// Commit message prefix classification
const TYPE_PATTERNS: Array<{ pattern: RegExp; type: Decision['type'] }> = [
  { pattern: /^feat(\(|:|\s|!)/i, type: 'feat' },
  { pattern: /^fix(\(|:|\s|!)/i, type: 'fix' },
  { pattern: /^refactor(\(|:|\s|!)/i, type: 'refactor' },
  { pattern: /^(ci|infra|build|chore\(deps\))(\(|:|\s|!)/i, type: 'infra' },
  { pattern: /^docs?(\(|:|\s|!)/i, type: 'docs' },
  { pattern: /^test(\(|:|\s|!)/i, type: 'test' },
  { pattern: /^chore(\(|:|\s|!)/i, type: 'chore' },
  { pattern: /^(style|perf|revert)(\(|:|\s|!)/i, type: 'chore' },
  // Fallback patterns for non-conventional commits
  { pattern: /\badd(s|ed|ing)?\b/i, type: 'feat' },
  { pattern: /\bfix(es|ed|ing)?\b/i, type: 'fix' },
  { pattern: /\brefactor/i, type: 'refactor' },
  { pattern: /\b(update|upgrade|bump)\b.*\b(dep|package|version)/i, type: 'infra' },
  { pattern: /\bdoc(s|ument)/i, type: 'docs' },
  { pattern: /\btest/i, type: 'test' },
];

function classifyCommit(message: string): Decision['type'] {
  for (const { pattern, type } of TYPE_PATTERNS) {
    if (pattern.test(message)) return type;
  }
  return 'chore';
}

/**
 * Check if two commits are temporally close (within 2-hour window).
 */
function isTemporallyClose(dateA: string, dateB: string): boolean {
  const a = new Date(dateA).getTime();
  const b = new Date(dateB).getTime();
  return Math.abs(a - b) < 2 * 60 * 60 * 1000; // 2 hours
}

/**
 * Check if two commits have overlapping files.
 */
function hasFileOverlap(filesA: string[], filesB: string[]): boolean {
  const setA = new Set(filesA);
  return filesB.some((f) => setA.has(f));
}

/**
 * Cluster commits into logical decisions.
 */
function clusterCommits(entries: GitLogEntry[]): Decision[] {
  if (entries.length === 0) return [];

  const decisions: Decision[] = [];
  let currentCluster: GitLogEntry[] = [entries[0]];
  let clusterId = 0;

  for (let i = 1; i < entries.length; i++) {
    const current = entries[i];
    const last = currentCluster[currentCluster.length - 1];

    // Cluster if: same type, temporally close, and file overlap
    const sameType = classifyCommit(current.message) === classifyCommit(last.message);
    const close = isTemporallyClose(current.date, last.date);
    const overlap = hasFileOverlap(current.files, last.files);

    if (sameType && close && overlap) {
      currentCluster.push(current);
    } else {
      // Emit current cluster as a decision
      decisions.push(clusterToDecision(currentCluster, clusterId++));
      currentCluster = [current];
    }
  }

  // Emit final cluster
  if (currentCluster.length > 0) {
    decisions.push(clusterToDecision(currentCluster, clusterId));
  }

  return decisions;
}

function clusterToDecision(cluster: GitLogEntry[], id: number): Decision {
  const commits: DecisionCommit[] = cluster.map((e) => ({
    hash: e.hash,
    author: e.author,
    date: e.date,
    message: e.message,
  }));

  const allFiles = sortedUnique(cluster.flatMap((e) => e.files));
  const type = classifyCommit(cluster[0].message);

  // Summary: use first commit message, cleaned up
  const summary = cluster[0].message
    .replace(/^(feat|fix|refactor|docs|test|chore|ci|build|style|perf|revert)(\([^)]*\))?[!:]?\s*/i, '')
    .trim();

  const dates = cluster.map((e) => e.date).sort();

  return {
    id: `decision-${id}`,
    type,
    summary: summary || cluster[0].message,
    commits,
    files: allFiles,
    dateRange: {
      start: dates[0],
      end: dates[dates.length - 1],
    },
  };
}

export async function analyzeDecisions(cwd: string): Promise<AnalyzerResult<Decisions>> {
  const entries = await getGitLog(cwd, 500);

  const decisions = clusterCommits(entries);

  const allDates = entries.map((e) => e.date).sort();

  return {
    name: 'decisions',
    data: {
      decisions,
      totalCommitsAnalyzed: entries.length,
      dateRange: {
        start: allDates[0] || '',
        end: allDates[allDates.length - 1] || '',
      },
    },
    deterministic: true,
  };
}

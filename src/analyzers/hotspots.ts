import { Hotspots, Hotspot, AnalyzerResult } from '../types.js';
import { getGitNumstat } from '../core/git.js';

/**
 * Calculate standard deviation.
 */
function stdDev(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squaredDiffs = values.map((v) => Math.pow(v - mean, 2));
  return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / values.length);
}

/**
 * Calculate recency weight: more recent changes score higher.
 * Returns a value between 0.5 and 1.0.
 */
function recencyWeight(lastModified: string): number {
  const now = Date.now();
  const modified = new Date(lastModified).getTime();
  const ageInDays = (now - modified) / (1000 * 60 * 60 * 24);

  // Decay over 365 days from 1.0 to 0.5
  return Math.max(0.5, 1.0 - (ageInDays / 730));
}

export async function analyzeHotspots(cwd: string, files: string[]): Promise<AnalyzerResult<Hotspots>> {
  const frequencies = await getGitNumstat(cwd, 1000);
  const fileSet = new Set(files);

  // Calculate composite scores
  const scored: Hotspot[] = [];

  for (const [file, freq] of frequencies) {
    if (!fileSet.has(file)) continue;

    const score = freq.changeCount * freq.authors.length * recencyWeight(freq.lastModified);

    scored.push({
      file,
      changeFrequency: freq.changeCount,
      authorCount: freq.authors.length,
      lastModified: freq.lastModified,
      score: Math.round(score * 100) / 100,
      isHot: false, // Set below
    });
  }

  // Add files with no git history (score = 0)
  for (const file of files) {
    if (!frequencies.has(file)) {
      scored.push({
        file,
        changeFrequency: 0,
        authorCount: 0,
        lastModified: '',
        score: 0,
        isHot: false,
      });
    }
  }

  // Calculate threshold: mean + 2 * stdDev
  const scores = scored.filter((s) => s.score > 0).map((s) => s.score);
  const mean = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  const sd = stdDev(scores);
  const threshold = mean + 2 * sd;

  // Mark hot files
  for (const hotspot of scored) {
    hotspot.isHot = hotspot.score > threshold;
  }

  // Sort by score descending, then by file name for determinism
  scored.sort((a, b) => b.score - a.score || a.file.localeCompare(b.file));

  return {
    name: 'hotspots',
    data: {
      hotspots: scored,
      commitsAnalyzed: frequencies.size,
      threshold: Math.round(threshold * 100) / 100,
      mean: Math.round(mean * 100) / 100,
      stdDev: Math.round(sd * 100) / 100,
    },
    deterministic: true,
  };
}

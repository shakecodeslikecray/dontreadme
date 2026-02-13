import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { RiskProfile, RiskEntry, RiskDomain, Hotspots, AnalyzerResult } from '../types.js';

// File path patterns that map to risk domains
const DOMAIN_PATTERNS: Array<{ pattern: RegExp; domain: RiskDomain; baseRisk: number }> = [
  { pattern: /\bauth/i, domain: 'auth', baseRisk: 9 },
  { pattern: /\bpayment|billing|checkout|stripe|charge/i, domain: 'payment', baseRisk: 10 },
  { pattern: /\bapi\b|routes?|endpoint|handler/i, domain: 'api', baseRisk: 7 },
  { pattern: /\bdb\b|database|prisma|sequelize|knex|migration/i, domain: 'database', baseRisk: 7 },
  { pattern: /\bfs\b|file-?system|upload|storage|s3/i, domain: 'file-system', baseRisk: 6 },
  { pattern: /\bcrypt|encrypt|decrypt|hash|secret|token|jwt|oauth/i, domain: 'crypto', baseRisk: 9 },
  { pattern: /\buser|profile|account|session/i, domain: 'user-data', baseRisk: 7 },
  { pattern: /\badmin|dashboard|manage/i, domain: 'admin', baseRisk: 8 },
  { pattern: /\bconfig|env|settings/i, domain: 'config', baseRisk: 5 },
];

// Mitigation patterns (presence of these reduces risk)
const MITIGATION_PATTERNS: Array<{ pattern: RegExp; name: string }> = [
  { pattern: /\.test\.|\.spec\.|__test__|__spec__/, name: 'has-tests' },
  { pattern: /validate|sanitize|escape|zod|joi|yup/, name: 'has-validation' },
  { pattern: /rate-?limit|throttle/, name: 'has-rate-limiting' },
  { pattern: /helmet|cors|csrf|csp/, name: 'has-security-headers' },
  { pattern: /audit|log|monitor/, name: 'has-audit-logging' },
];

function classifyDomain(filePath: string): { domain: RiskDomain; baseRisk: number } {
  for (const { pattern, domain, baseRisk } of DOMAIN_PATTERNS) {
    if (pattern.test(filePath)) {
      return { domain, baseRisk };
    }
  }
  return { domain: 'general', baseRisk: 2 };
}

function detectMitigations(cwd: string, file: string): string[] {
  const mitigations: string[] = [];

  try {
    const content = readFileSync(join(cwd, file), 'utf-8');
    for (const { pattern, name } of MITIGATION_PATTERNS) {
      if (pattern.test(content) || pattern.test(file)) {
        mitigations.push(name);
      }
    }

    // Check if companion test file exists
    const testVariants = [
      file.replace(/\.ts$/, '.test.ts'),
      file.replace(/\.ts$/, '.spec.ts'),
      file.replace(/\.tsx$/, '.test.tsx'),
      file.replace(/\.js$/, '.test.js'),
    ];
    for (const variant of testVariants) {
      if (existsSync(join(cwd, variant))) {
        mitigations.push('has-companion-test');
        break;
      }
    }
  } catch {
    // Skip files that can't be read
  }

  return mitigations.sort();
}

function countExternalDeps(cwd: string, file: string): number {
  try {
    const content = readFileSync(join(cwd, file), 'utf-8');
    const externalImports = content.match(/import\s+.+from\s+['"](?!\.)[^'"]+['"]/g);
    return externalImports?.length || 0;
  } catch {
    return 0;
  }
}

export async function analyzeRiskProfile(
  cwd: string,
  files: string[],
  hotspots: Hotspots,
): Promise<AnalyzerResult<RiskProfile>> {
  const hotspotMap = new Map(hotspots.hotspots.map((h) => [h.file, h]));

  const entries: RiskEntry[] = [];

  for (const file of files) {
    const { domain, baseRisk } = classifyDomain(file);
    const hotspot = hotspotMap.get(file);
    const hotspotMultiplier = hotspot?.isHot ? 1.5 : hotspot?.score ? 1.0 + (hotspot.score / (hotspots.mean * 4 || 1)) * 0.5 : 1.0;
    const externalDepCount = countExternalDeps(cwd, file);
    const mitigations = detectMitigations(cwd, file);

    // Mitigations reduce risk
    const mitigationFactor = Math.max(0.5, 1.0 - mitigations.length * 0.1);

    const finalScore = Math.round(
      baseRisk * hotspotMultiplier * (1 + externalDepCount * 0.1) * mitigationFactor * 100,
    ) / 100;

    entries.push({
      file,
      domain,
      baseRisk,
      hotspotMultiplier: Math.round(hotspotMultiplier * 100) / 100,
      externalDepCount,
      finalScore,
      mitigations,
    });
  }

  // Sort by finalScore descending
  entries.sort((a, b) => b.finalScore - a.finalScore || a.file.localeCompare(b.file));

  // Categorize into severity buckets
  const summary = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const entry of entries) {
    if (entry.finalScore >= 12) summary.critical++;
    else if (entry.finalScore >= 8) summary.high++;
    else if (entry.finalScore >= 4) summary.medium++;
    else summary.low++;
  }

  // Top 10 highest risk files
  const highestRisk = entries.slice(0, 10).map((e) => e.file);

  return {
    name: 'risk-profile',
    data: {
      entries,
      summary,
      highestRisk,
    },
    deterministic: true,
  };
}

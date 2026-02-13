import { AnalyzerResult, ArtifactName, Architecture, DependencyGraph, ApiSurface, Decisions, Hotspots, RiskProfile, UnderstandingMeta, Contracts } from '../types.js';
import { analyzeArchitecture } from './architecture.js';
import { analyzeDependencyGraph } from './dependency-graph.js';
import { analyzeApiSurface } from './api-surface.js';
import { analyzeDecisions } from './decisions.js';
import { analyzeHotspots } from './hotspots.js';
import { analyzeRiskProfile } from './risk-profile.js';
import { analyzeUnderstanding } from './understanding.js';
import { analyzeContracts } from './contracts.js';
import { isGitRepo } from '../core/git.js';

export interface AnalysisProgress {
  artifact: ArtifactName;
  status: 'started' | 'completed' | 'skipped' | 'error';
  error?: string;
}

export interface AnalysisResults {
  architecture: AnalyzerResult<Architecture>;
  'dependency-graph': AnalyzerResult<DependencyGraph>;
  'api-surface': AnalyzerResult<ApiSurface>;
  decisions: AnalyzerResult<Decisions>;
  hotspots: AnalyzerResult<Hotspots>;
  'risk-profile': AnalyzerResult<RiskProfile>;
  understanding: AnalyzerResult<UnderstandingMeta>;
  contracts: AnalyzerResult<Contracts>;
}

/**
 * Run all analyzers with dependency ordering.
 *
 * Execution order:
 *   Level 0 (parallel): architecture, dependency-graph, api-surface, decisions, hotspots
 *   Level 1 (needs hotspots): risk-profile
 *   Level 2 (needs arch + api, LLM): understanding
 *   Level 3 (needs understanding, LLM): contracts
 */
export async function runAnalyzers(
  cwd: string,
  files: string[],
  options?: {
    only?: ArtifactName[];
    onProgress?: (progress: AnalysisProgress) => void;
  },
): Promise<AnalysisResults> {
  const { only, onProgress } = options || {};
  const hasGit = await isGitRepo(cwd);

  const shouldRun = (name: ArtifactName): boolean => {
    if (!only || only.length === 0) return true;
    return only.includes(name);
  };

  const progress = (artifact: ArtifactName, status: AnalysisProgress['status'], error?: string) => {
    onProgress?.({ artifact, status, error });
  };

  // Level 0: Parallel (no dependencies)
  progress('architecture', 'started');
  progress('dependency-graph', 'started');
  progress('api-surface', 'started');
  if (hasGit) {
    progress('decisions', 'started');
    progress('hotspots', 'started');
  }

  const level0 = await Promise.all([
    shouldRun('architecture')
      ? analyzeArchitecture(cwd, files).then((r) => { progress('architecture', 'completed'); return r; })
      : null,
    shouldRun('dependency-graph')
      ? analyzeDependencyGraph(cwd, files).then((r) => { progress('dependency-graph', 'completed'); return r; })
      : null,
    shouldRun('api-surface')
      ? analyzeApiSurface(cwd, files).then((r) => { progress('api-surface', 'completed'); return r; })
      : null,
    shouldRun('decisions') && hasGit
      ? analyzeDecisions(cwd).then((r) => { progress('decisions', 'completed'); return r; })
      : (() => { if (!hasGit) progress('decisions', 'skipped'); return null; })(),
    shouldRun('hotspots') && hasGit
      ? analyzeHotspots(cwd, files).then((r) => { progress('hotspots', 'completed'); return r; })
      : (() => { if (!hasGit) progress('hotspots', 'skipped'); return null; })(),
  ]);

  const [architecture, dependencyGraph, apiSurface, decisions, hotspots] = level0;

  // Level 1: Needs hotspots
  let riskProfile: AnalyzerResult<RiskProfile> | null = null;
  if (shouldRun('risk-profile')) {
    progress('risk-profile', 'started');
    const hotspotsData = hotspots?.data || {
      hotspots: [],
      commitsAnalyzed: 0,
      threshold: 0,
      mean: 0,
      stdDev: 0,
    };
    riskProfile = await analyzeRiskProfile(cwd, files, hotspotsData);
    progress('risk-profile', 'completed');
  }

  // Level 2: Understanding (LLM - placeholder for Phase 1)
  let understanding: AnalyzerResult<UnderstandingMeta> | null = null;
  if (shouldRun('understanding')) {
    progress('understanding', 'started');
    understanding = await analyzeUnderstanding(cwd, files);
    progress('understanding', 'completed');
  }

  // Level 3: Contracts (LLM - placeholder for Phase 1)
  let contracts: AnalyzerResult<Contracts> | null = null;
  if (shouldRun('contracts')) {
    progress('contracts', 'started');
    contracts = await analyzeContracts(cwd, files);
    progress('contracts', 'completed');
  }

  // Return results with defaults for skipped analyzers
  return {
    architecture: architecture || { name: 'architecture', data: { components: [], edges: [], layers: [], entrypoints: [] }, deterministic: true },
    'dependency-graph': dependencyGraph || { name: 'dependency-graph', data: { nodes: [], circularDeps: [], hubs: [], entrypoints: [], totalFiles: 0, totalEdges: 0 }, deterministic: true },
    'api-surface': apiSurface || { name: 'api-surface', data: { framework: null, routes: [], exports: [], endpoints: [] }, deterministic: true },
    decisions: decisions || { name: 'decisions', data: { decisions: [], totalCommitsAnalyzed: 0, dateRange: { start: '', end: '' } }, deterministic: true },
    hotspots: hotspots || { name: 'hotspots', data: { hotspots: [], commitsAnalyzed: 0, threshold: 0, mean: 0, stdDev: 0 }, deterministic: true },
    'risk-profile': riskProfile || { name: 'risk-profile', data: { entries: [], summary: { critical: 0, high: 0, medium: 0, low: 0 }, highestRisk: [] }, deterministic: true },
    understanding: understanding || { name: 'understanding', data: { generated: false, requiresLLM: true, placeholder: true }, deterministic: false },
    contracts: contracts || { name: 'contracts', data: { contracts: [], generated: false, requiresLLM: true }, deterministic: false },
  };
}

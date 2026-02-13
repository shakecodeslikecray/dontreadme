import { z } from 'zod';

// ─────────────────────────────────────────────────────────────
// Provider Types
// ─────────────────────────────────────────────────────────────

export const ProviderTypeSchema = z.enum([
  'claude-code',
  'codex',
  'gemini',
  'aider',
  'ollama',
  'opencode',
]);
export type ProviderType = z.infer<typeof ProviderTypeSchema>;

// ─────────────────────────────────────────────────────────────
// Manifest (manifest.json)
// ─────────────────────────────────────────────────────────────

export const ManifestArtifactSchema = z.object({
  name: z.string(),
  path: z.string(),
  hash: z.string(),
  generatedAt: z.string(),
  analyzer: z.string(),
  deterministic: z.boolean(),
});
export type ManifestArtifact = z.infer<typeof ManifestArtifactSchema>;

export const ManifestSchema = z.object({
  version: z.literal('1'),
  generator: z.string(),
  generatorVersion: z.string(),
  generatedAt: z.string(),
  codebaseRoot: z.string(),
  artifacts: z.array(ManifestArtifactSchema),
});
export type Manifest = z.infer<typeof ManifestSchema>;

// ─────────────────────────────────────────────────────────────
// Architecture (architecture.json)
// ─────────────────────────────────────────────────────────────

export const ArchitectureComponentSchema = z.object({
  name: z.string(),
  path: z.string(),
  files: z.array(z.string()),
  type: z.enum(['module', 'component', 'service', 'utility', 'config', 'test', 'entrypoint']),
  exports: z.array(z.string()),
  imports: z.array(z.string()),
});
export type ArchitectureComponent = z.infer<typeof ArchitectureComponentSchema>;

export const ArchitectureEdgeSchema = z.object({
  from: z.string(),
  to: z.string(),
  imports: z.array(z.string()),
});
export type ArchitectureEdge = z.infer<typeof ArchitectureEdgeSchema>;

export const ArchitectureLayerSchema = z.object({
  name: z.string(),
  components: z.array(z.string()),
  level: z.number(),
});
export type ArchitectureLayer = z.infer<typeof ArchitectureLayerSchema>;

export const ArchitectureSchema = z.object({
  components: z.array(ArchitectureComponentSchema),
  edges: z.array(ArchitectureEdgeSchema),
  layers: z.array(ArchitectureLayerSchema),
  entrypoints: z.array(z.string()),
});
export type Architecture = z.infer<typeof ArchitectureSchema>;

// ─────────────────────────────────────────────────────────────
// Dependency Graph (dependency-graph.json)
// ─────────────────────────────────────────────────────────────

export const DependencyNodeSchema = z.object({
  file: z.string(),
  imports: z.array(z.string()),
  importedBy: z.array(z.string()),
  inDegree: z.number(),
  outDegree: z.number(),
});
export type DependencyNode = z.infer<typeof DependencyNodeSchema>;

export const DependencyGraphSchema = z.object({
  nodes: z.array(DependencyNodeSchema),
  circularDeps: z.array(z.array(z.string())),
  hubs: z.array(z.string()),
  entrypoints: z.array(z.string()),
  totalFiles: z.number(),
  totalEdges: z.number(),
});
export type DependencyGraph = z.infer<typeof DependencyGraphSchema>;

// ─────────────────────────────────────────────────────────────
// API Surface (api-surface.json)
// ─────────────────────────────────────────────────────────────

export const ApiRouteSchema = z.object({
  method: z.string(),
  path: z.string(),
  file: z.string(),
  line: z.number().optional(),
  handler: z.string().optional(),
});
export type ApiRoute = z.infer<typeof ApiRouteSchema>;

export const ExportedSymbolSchema = z.object({
  name: z.string(),
  type: z.enum(['function', 'class', 'const', 'type', 'interface', 'enum', 'default']),
  file: z.string(),
  line: z.number().optional(),
});
export type ExportedSymbol = z.infer<typeof ExportedSymbolSchema>;

export const ApiSurfaceSchema = z.object({
  framework: z.string().nullable(),
  routes: z.array(ApiRouteSchema),
  exports: z.array(ExportedSymbolSchema),
  endpoints: z.array(ApiRouteSchema),
});
export type ApiSurface = z.infer<typeof ApiSurfaceSchema>;

// ─────────────────────────────────────────────────────────────
// Decisions (decisions/index.json)
// ─────────────────────────────────────────────────────────────

export const DecisionCommitSchema = z.object({
  hash: z.string(),
  author: z.string(),
  date: z.string(),
  message: z.string(),
});
export type DecisionCommit = z.infer<typeof DecisionCommitSchema>;

export const DecisionSchema = z.object({
  id: z.string(),
  type: z.enum(['feat', 'fix', 'refactor', 'infra', 'docs', 'test', 'chore']),
  summary: z.string(),
  commits: z.array(DecisionCommitSchema),
  files: z.array(z.string()),
  dateRange: z.object({
    start: z.string(),
    end: z.string(),
  }),
});
export type Decision = z.infer<typeof DecisionSchema>;

export const DecisionsSchema = z.object({
  decisions: z.array(DecisionSchema),
  totalCommitsAnalyzed: z.number(),
  dateRange: z.object({
    start: z.string(),
    end: z.string(),
  }),
});
export type Decisions = z.infer<typeof DecisionsSchema>;

// ─────────────────────────────────────────────────────────────
// Hotspots (hotspots.json)
// ─────────────────────────────────────────────────────────────

export const HotspotSchema = z.object({
  file: z.string(),
  changeFrequency: z.number(),
  authorCount: z.number(),
  lastModified: z.string(),
  score: z.number(),
  isHot: z.boolean(),
});
export type Hotspot = z.infer<typeof HotspotSchema>;

export const HotspotsSchema = z.object({
  hotspots: z.array(HotspotSchema),
  commitsAnalyzed: z.number(),
  threshold: z.number(),
  mean: z.number(),
  stdDev: z.number(),
});
export type Hotspots = z.infer<typeof HotspotsSchema>;

// ─────────────────────────────────────────────────────────────
// Risk Profile (risk-profile.json)
// ─────────────────────────────────────────────────────────────

export const RiskDomainSchema = z.enum([
  'auth',
  'payment',
  'api',
  'database',
  'file-system',
  'crypto',
  'user-data',
  'admin',
  'config',
  'general',
]);
export type RiskDomain = z.infer<typeof RiskDomainSchema>;

export const RiskEntrySchema = z.object({
  file: z.string(),
  domain: RiskDomainSchema,
  baseRisk: z.number(),
  hotspotMultiplier: z.number(),
  externalDepCount: z.number(),
  finalScore: z.number(),
  mitigations: z.array(z.string()),
});
export type RiskEntry = z.infer<typeof RiskEntrySchema>;

export const RiskProfileSchema = z.object({
  entries: z.array(RiskEntrySchema),
  summary: z.object({
    critical: z.number(),
    high: z.number(),
    medium: z.number(),
    low: z.number(),
  }),
  highestRisk: z.array(z.string()),
});
export type RiskProfile = z.infer<typeof RiskProfileSchema>;

// ─────────────────────────────────────────────────────────────
// Understanding (understanding.md) - metadata only for manifest
// ─────────────────────────────────────────────────────────────

export const UnderstandingMetaSchema = z.object({
  generated: z.boolean(),
  requiresLLM: z.boolean(),
  placeholder: z.boolean(),
});
export type UnderstandingMeta = z.infer<typeof UnderstandingMetaSchema>;

// ─────────────────────────────────────────────────────────────
// Contracts (contracts/intent.yml) - metadata only for manifest
// ─────────────────────────────────────────────────────────────

export const ContractSchema = z.object({
  function: z.string(),
  file: z.string(),
  preconditions: z.array(z.string()),
  postconditions: z.array(z.string()),
  invariants: z.array(z.string()),
  sideEffects: z.array(z.string()),
});
export type Contract = z.infer<typeof ContractSchema>;

export const ContractsSchema = z.object({
  contracts: z.array(ContractSchema),
  generated: z.boolean(),
  requiresLLM: z.boolean(),
});
export type Contracts = z.infer<typeof ContractsSchema>;

// ─────────────────────────────────────────────────────────────
// Config (stored in manifest.json)
// ─────────────────────────────────────────────────────────────

export const DontreadmeConfigSchema = z.object({
  version: z.literal('1'),
  provider: ProviderTypeSchema.optional(),
  include: z.array(z.string()).default(['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx']),
  exclude: z.array(z.string()).default([
    'node_modules', 'dist', 'build', '.next', 'coverage',
    '**/*.test.*', '**/*.spec.*', '**/*.d.ts',
  ]),
});
export type DontreadmeConfig = z.infer<typeof DontreadmeConfigSchema>;

// ─────────────────────────────────────────────────────────────
// Analyzer Result Types
// ─────────────────────────────────────────────────────────────

export type ArtifactName =
  | 'manifest'
  | 'understanding'
  | 'architecture'
  | 'contracts'
  | 'decisions'
  | 'risk-profile'
  | 'hotspots'
  | 'dependency-graph'
  | 'api-surface';

export interface AnalyzerResult<T = unknown> {
  name: ArtifactName;
  data: T;
  deterministic: boolean;
}

// ─────────────────────────────────────────────────────────────
// Bridge File Types
// ─────────────────────────────────────────────────────────────

export const BridgeToolSchema = z.enum([
  'claude-code',
  'cursor',
  'copilot',
  'windsurf',
  'codex',
]);
export type BridgeTool = z.infer<typeof BridgeToolSchema>;

export interface BridgeFileConfig {
  tool: BridgeTool;
  filenames: string[];
}

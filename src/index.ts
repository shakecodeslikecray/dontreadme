// dontreadme - Machine-readable codebase context for AI tools

export * from './types.js';
export { loadManifest, saveManifest, isInitialized, loadConfig, ensureDontreadmeDir } from './core/config.js';
export { discoverFiles, readSourceFile, detectFramework, detectLanguage } from './core/file-discovery.js';
export { isGitRepo, getGitLog, getGitNumstat } from './core/git.js';
export { detectBridgeFiles, injectBridgeBlock, removeBridgeBlock, getBridgeSummary } from './core/bridge-files.js';
export { stableStringify, hashContent, normalizePath } from './core/utils.js';
export { runAnalyzers } from './analyzers/index.js';
export type { AnalysisResults, AnalysisProgress } from './analyzers/index.js';
export { writeAllArtifacts } from './writers/index.js';
export { getExecutor, getAvailableExecutors } from './providers/index.js';
export { detectProvider, isProviderAvailable, getProviderCommand } from './providers/detect.js';
export type { PromptExecutor, PromptOptions, PromptResult } from './providers/executors/types.js';

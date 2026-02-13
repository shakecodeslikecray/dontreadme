/**
 * Prompt template for generating behavioral contracts via LLM.
 * Phase 2 - not used in Phase 1 MVP.
 */
export function buildContractsPrompt(context: {
  functionName: string;
  filePath: string;
  sourceCode: string;
  domain: string;
}): string {
  return `Analyze this function and extract behavioral contracts.

## Function: ${context.functionName}
## File: ${context.filePath}
## Domain: ${context.domain}

\`\`\`
${context.sourceCode}
\`\`\`

Return a YAML object with these fields:
- function: "${context.functionName}"
- file: "${context.filePath}"
- preconditions: list of conditions that must be true before calling
- postconditions: list of conditions guaranteed after the function returns
- invariants: list of conditions that are always true during execution
- sideEffects: list of side effects (DB writes, API calls, file I/O, events)

Be precise. Only list contracts that can be verified from the source code.`;
}

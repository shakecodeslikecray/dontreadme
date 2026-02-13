/**
 * Prompt template for generating understanding.md via LLM.
 * Phase 2 - not used in Phase 1 MVP.
 */
export function buildUnderstandingPrompt(context: {
  architecture: string;
  apiSurface: string;
  sampleFiles: string[];
  readme?: string;
}): string {
  return `Analyze this codebase and generate a concise understanding document in Markdown.

## Architecture
${context.architecture}

## API Surface
${context.apiSurface}

${context.readme ? `## README\n${context.readme}` : ''}

## Sample Files
${context.sampleFiles.map((f) => `\`\`\`\n${f}\n\`\`\``).join('\n\n')}

Generate a Markdown document with these sections:
1. **Overview** - What this codebase does in 2-3 sentences
2. **Architecture** - How the code is organized, key components, data flow
3. **Key Technologies** - Languages, frameworks, major dependencies
4. **Main User Flows** - The primary operations/workflows this code supports

Be concise and factual. Focus on what's actually in the code, not assumptions.`;
}

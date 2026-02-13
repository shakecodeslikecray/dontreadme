/**
 * Minimal provider interface.
 * All providers are "dumb prompt executors" - no analysis logic.
 */
export interface PromptOptions {
  cwd: string;
  timeout?: number;
}

export interface PromptResult {
  output: string;
  error?: string;
}

export interface PromptExecutor {
  name: string;
  isAvailable(): Promise<boolean>;
  runPrompt(prompt: string, options: PromptOptions): Promise<PromptResult>;
}

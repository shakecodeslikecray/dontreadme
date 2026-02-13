import { execa } from 'execa';
import { PromptExecutor, PromptOptions, PromptResult } from './types.js';
import { getProviderCommand } from '../detect.js';

export class CodexExecutor implements PromptExecutor {
  name = 'codex';

  async isAvailable(): Promise<boolean> {
    try {
      await execa(getProviderCommand('codex'), ['--version'], { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  async runPrompt(prompt: string, options: PromptOptions): Promise<PromptResult> {
    try {
      const { stdout, stderr } = await execa(
        getProviderCommand('codex'),
        ['--quiet', prompt],
        {
          cwd: options.cwd,
          timeout: options.timeout || 300000,
        },
      );
      return { output: stdout, error: stderr || undefined };
    } catch (error: any) {
      return { output: '', error: error.message };
    }
  }
}

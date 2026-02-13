import { execa } from 'execa';
import { PromptExecutor, PromptOptions, PromptResult } from './types.js';
import { getProviderCommand } from '../detect.js';

export class GeminiExecutor implements PromptExecutor {
  name = 'gemini';

  async isAvailable(): Promise<boolean> {
    try {
      await execa(getProviderCommand('gemini'), ['--version'], { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  async runPrompt(prompt: string, options: PromptOptions): Promise<PromptResult> {
    try {
      const { stdout, stderr } = await execa(
        getProviderCommand('gemini'),
        [prompt],
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

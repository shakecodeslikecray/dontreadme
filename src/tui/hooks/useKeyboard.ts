import { useInput, useApp } from 'ink';
import { Panel } from './usePanelFocus.js';

interface KeyboardOptions {
  focusedPanel: Panel;
  onToggleFocus: () => void;
  onTreeUp: () => void;
  onTreeDown: () => void;
  onTreeSelect: () => void;
  onContentUp: () => void;
  onContentDown: () => void;
  onContentPageUp: () => void;
  onContentPageDown: () => void;
  onGenerate: () => void;
  onHelp: () => void;
  onQuit: () => void;
}

export function useKeyboard(options: KeyboardOptions): void {
  const { exit } = useApp();

  useInput((input, key) => {
    // Global keys
    if (input === 'q') {
      options.onQuit();
      exit();
      return;
    }

    if (key.tab) {
      options.onToggleFocus();
      return;
    }

    if (input === 'g') {
      options.onGenerate();
      return;
    }

    if (input === '?') {
      options.onHelp();
      return;
    }

    // Panel-specific keys
    if (options.focusedPanel === 'tree') {
      if (key.upArrow || input === 'k') options.onTreeUp();
      if (key.downArrow || input === 'j') options.onTreeDown();
      if (key.return) options.onTreeSelect();
    }

    if (options.focusedPanel === 'content') {
      if (key.upArrow || input === 'k') options.onContentUp();
      if (key.downArrow || input === 'j') options.onContentDown();
      if (key.pageUp) options.onContentPageUp();
      if (key.pageDown) options.onContentPageDown();
    }
  });
}

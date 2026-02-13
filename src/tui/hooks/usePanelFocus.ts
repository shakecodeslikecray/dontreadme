import { useState, useCallback } from 'react';

export type Panel = 'tree' | 'content';

export function usePanelFocus() {
  const [focusedPanel, setFocusedPanel] = useState<Panel>('tree');

  const toggleFocus = useCallback(() => {
    setFocusedPanel((prev) => (prev === 'tree' ? 'content' : 'tree'));
  }, []);

  return { focusedPanel, setFocusedPanel, toggleFocus };
}

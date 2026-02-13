import { useState, useCallback, useMemo } from 'react';

export function useScrollable(totalLines: number, viewportHeight: number) {
  const [scrollOffset, setScrollOffset] = useState(0);

  const maxOffset = useMemo(
    () => Math.max(0, totalLines - viewportHeight),
    [totalLines, viewportHeight],
  );

  const scrollUp = useCallback((amount = 1) => {
    setScrollOffset((prev) => Math.max(0, prev - amount));
  }, []);

  const scrollDown = useCallback((amount = 1) => {
    setScrollOffset((prev) => Math.min(maxOffset, prev + amount));
  }, [maxOffset]);

  const scrollToTop = useCallback(() => {
    setScrollOffset(0);
  }, []);

  const scrollToBottom = useCallback(() => {
    setScrollOffset(maxOffset);
  }, [maxOffset]);

  const visibleRange = useMemo(
    () => ({ start: scrollOffset, end: Math.min(scrollOffset + viewportHeight, totalLines) }),
    [scrollOffset, viewportHeight, totalLines],
  );

  return {
    scrollOffset,
    setScrollOffset,
    scrollUp,
    scrollDown,
    scrollToTop,
    scrollToBottom,
    visibleRange,
    maxOffset,
  };
}

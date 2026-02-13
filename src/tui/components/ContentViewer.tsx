import React, { useMemo } from 'react';
import { Box, Text } from 'ink';

interface ContentViewerProps {
  content: string;
  type: 'json' | 'yaml' | 'markdown' | 'unknown';
  title: string;
  focused: boolean;
  scrollOffset: number;
  viewportHeight: number;
}

export const ContentViewer: React.FC<ContentViewerProps> = ({
  content,
  type,
  title,
  focused,
  scrollOffset,
  viewportHeight,
}) => {
  const lines = useMemo(() => content.split('\n'), [content]);
  const visibleLines = lines.slice(scrollOffset, scrollOffset + viewportHeight);
  const totalLines = lines.length;
  const scrollPercent = totalLines > viewportHeight
    ? Math.round((scrollOffset / (totalLines - viewportHeight)) * 100)
    : 100;

  return (
    <Box
      flexDirection="column"
      flexGrow={1}
      borderStyle="single"
      borderColor={focused ? 'cyan' : 'gray'}
      paddingX={1}
    >
      <Box justifyContent="space-between">
        <Text bold color={focused ? 'cyan' : 'gray'}>{title}</Text>
        <Text color="gray">
          {scrollOffset + 1}-{Math.min(scrollOffset + viewportHeight, totalLines)}/{totalLines} ({scrollPercent}%)
        </Text>
      </Box>
      <Box flexDirection="column" marginTop={1}>
        {visibleLines.map((line, idx) => (
          <Text key={scrollOffset + idx} wrap="truncate">
            {colorize(line, type)}
          </Text>
        ))}
      </Box>
    </Box>
  );
};

function colorize(line: string, type: string): string {
  // Simple passthrough - Ink handles color through <Text> components
  // For Phase 1, we just show raw text. Syntax highlighting is Phase 3.
  return line;
}

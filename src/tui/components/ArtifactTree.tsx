import React from 'react';
import { Box, Text } from 'ink';
import { ArtifactEntry } from '../hooks/useArtifacts.js';

interface ArtifactTreeProps {
  tree: ArtifactEntry[];
  selectedIndex: number;
  focused: boolean;
  width: number;
}

interface FlatEntry {
  entry: ArtifactEntry;
  depth: number;
  isChild: boolean;
}

function flattenTree(tree: ArtifactEntry[]): FlatEntry[] {
  const result: FlatEntry[] = [];
  for (const entry of tree) {
    if (entry.isDir) {
      result.push({ entry, depth: 0, isChild: false });
      for (const child of entry.children || []) {
        result.push({ entry: child, depth: 1, isChild: true });
      }
    } else {
      result.push({ entry, depth: 0, isChild: false });
    }
  }
  return result;
}

export const ArtifactTree: React.FC<ArtifactTreeProps> = ({
  tree,
  selectedIndex,
  focused,
  width,
}) => {
  const flat = flattenTree(tree);

  return (
    <Box
      flexDirection="column"
      width={width}
      borderStyle="single"
      borderColor={focused ? 'cyan' : 'gray'}
      paddingX={1}
    >
      <Text bold color={focused ? 'cyan' : 'gray'}>.dontreadme/</Text>
      {flat.map((item, idx) => {
        const isSelected = idx === selectedIndex;
        const prefix = item.isChild ? ' \u2514 ' : ' ';
        const icon = item.entry.isDir ? '\u25BC ' : '';
        const label = icon + item.entry.name;
        const displayLabel = label.slice(0, width - 4);

        return (
          <Box key={item.entry.path}>
            <Text
              color={isSelected ? (focused ? 'cyan' : 'white') : 'gray'}
              bold={isSelected}
              inverse={isSelected && focused}
            >
              {isSelected ? '>' : ' '}
              {prefix}{displayLabel}
            </Text>
          </Box>
        );
      })}
    </Box>
  );
};

export { flattenTree };
export type { FlatEntry };

import React from 'react';
import { Box, Text } from 'ink';

interface HelpOverlayProps {
  visible: boolean;
}

const HELP_ITEMS = [
  ['tab', 'Switch panel focus'],
  ['j / \u2193', 'Move down'],
  ['k / \u2191', 'Move up'],
  ['enter', 'Select artifact'],
  ['g', 'Regenerate artifacts'],
  ['?', 'Toggle help'],
  ['q', 'Quit'],
];

export const HelpOverlay: React.FC<HelpOverlayProps> = ({ visible }) => {
  if (!visible) return null;

  return (
    <Box
      flexDirection="column"
      borderStyle="double"
      borderColor="cyan"
      paddingX={2}
      paddingY={1}
    >
      <Text bold color="cyan">Keyboard Shortcuts</Text>
      <Text> </Text>
      {HELP_ITEMS.map(([key, desc]) => (
        <Box key={key}>
          <Box width={12}>
            <Text color="yellow">{key}</Text>
          </Box>
          <Text color="white">{desc}</Text>
        </Box>
      ))}
      <Text> </Text>
      <Text color="gray">Press ? to close</Text>
    </Box>
  );
};

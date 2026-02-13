import React from 'react';
import { Box, Text } from 'ink';

interface BottomBarProps {
  showHelp?: boolean;
}

export const BottomBar: React.FC<BottomBarProps> = ({ showHelp }) => {
  return (
    <Box
      borderStyle="single"
      borderColor="gray"
      paddingX={1}
    >
      <Text color="gray">
        [tab] Panel  [g] Generate  [?] Help  [q] Quit  [j/k] Navigate
      </Text>
    </Box>
  );
};

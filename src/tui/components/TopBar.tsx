import React from 'react';
import { Box, Text } from 'ink';

interface TopBarProps {
  version: string;
  projectName: string;
  lastGenerated: string;
}

export const TopBar: React.FC<TopBarProps> = ({ version, projectName, lastGenerated }) => {
  return (
    <Box
      borderStyle="single"
      borderColor="gray"
      paddingX={1}
      justifyContent="space-between"
    >
      <Box>
        <Text bold color="cyan">dontreadme</Text>
        <Text color="gray"> v{version}</Text>
        <Text color="gray"> | </Text>
        <Text color="white">{projectName}</Text>
      </Box>
      <Box>
        <Text color="gray">{lastGenerated}</Text>
      </Box>
    </Box>
  );
};

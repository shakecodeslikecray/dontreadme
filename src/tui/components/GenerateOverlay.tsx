import React from 'react';
import { Box, Text } from 'ink';

interface GenerateOverlayProps {
  visible: boolean;
  status: string;
  artifact: string;
}

export const GenerateOverlay: React.FC<GenerateOverlayProps> = ({
  visible,
  status,
  artifact,
}) => {
  if (!visible) return null;

  return (
    <Box
      flexDirection="column"
      borderStyle="double"
      borderColor="cyan"
      paddingX={2}
      paddingY={1}
      alignItems="center"
    >
      <Text bold color="cyan">Regenerating...</Text>
      <Text color="gray">{artifact}</Text>
      <Text color="white">{status}</Text>
    </Box>
  );
};

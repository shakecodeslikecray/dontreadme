import React, { useState, useMemo, useCallback } from 'react';
import { Box, Text, useStdout } from 'ink';
import { useArtifacts, ArtifactEntry } from './hooks/useArtifacts.js';
import { usePanelFocus } from './hooks/usePanelFocus.js';
import { useScrollable } from './hooks/useScrollable.js';
import { useKeyboard } from './hooks/useKeyboard.js';
import { TopBar } from './components/TopBar.js';
import { BottomBar } from './components/BottomBar.js';
import { ArtifactTree, flattenTree } from './components/ArtifactTree.js';
import { ContentViewer } from './components/ContentViewer.js';
import { HelpOverlay } from './components/HelpOverlay.js';
import { GenerateOverlay } from './components/GenerateOverlay.js';

interface AppProps {
  cwd: string;
  version: string;
  projectName: string;
  lastGenerated: string;
}

export const App: React.FC<AppProps> = ({ cwd, version, projectName, lastGenerated }) => {
  const { stdout } = useStdout();
  const cols = stdout?.columns || 80;
  const rows = stdout?.rows || 24;

  const { tree, flatList, reload } = useArtifacts(cwd);
  const { focusedPanel, toggleFocus } = usePanelFocus();

  const [treeSelectedIndex, setTreeSelectedIndex] = useState(0);
  const [showHelp, setShowHelp] = useState(false);
  const [showGenerate, setShowGenerate] = useState(false);
  const [generateStatus, setGenerateStatus] = useState('');
  const [generateArtifact, setGenerateArtifact] = useState('');

  // Flatten tree for navigation
  const flatTree = useMemo(() => flattenTree(tree), [tree]);

  // Get selected artifact content
  const selectedFlat = flatTree[treeSelectedIndex];
  const selectedEntry: ArtifactEntry | null = selectedFlat?.entry?.isDir
    ? selectedFlat.entry.children?.[0] || null
    : selectedFlat?.entry || null;

  const content = selectedEntry?.content || '(no content)';
  const contentLines = useMemo(() => content.split('\n'), [content]);

  // Layout
  const treeWidth = Math.min(24, Math.floor(cols * 0.25));
  const contentViewportHeight = Math.max(1, rows - 6); // top bar + bottom bar + borders

  // Content scrolling
  const contentScroll = useScrollable(contentLines.length, contentViewportHeight);

  // Tree navigation
  const treeUp = useCallback(() => {
    setTreeSelectedIndex((prev) => Math.max(0, prev - 1));
    contentScroll.scrollToTop();
  }, [contentScroll]);

  const treeDown = useCallback(() => {
    setTreeSelectedIndex((prev) => Math.min(flatTree.length - 1, prev + 1));
    contentScroll.scrollToTop();
  }, [flatTree.length, contentScroll]);

  const treeSelect = useCallback(() => {
    // If it's a directory, expand/collapse would go here
    // For now, just focus content panel
    if (selectedFlat?.entry && !selectedFlat.entry.isDir) {
      toggleFocus();
    }
  }, [selectedFlat, toggleFocus]);

  // Generate handler
  const handleGenerate = useCallback(async () => {
    setShowGenerate(true);
    setGenerateStatus('Running analyzers...');

    try {
      const { discoverFiles } = await import('../core/file-discovery.js');
      const { runAnalyzers } = await import('../analyzers/index.js');
      const { ensureDontreadmeDir } = await import('../core/config.js');
      const { writeAllArtifacts } = await import('../writers/index.js');

      const files = await discoverFiles(cwd);
      const results = await runAnalyzers(cwd, files, {
        onProgress: (progress) => {
          setGenerateArtifact(progress.artifact);
          setGenerateStatus(`Analyzing ${progress.artifact}...`);
        },
      });

      setGenerateStatus('Writing artifacts...');
      ensureDontreadmeDir(cwd);
      writeAllArtifacts({ cwd, results, files, version });

      reload();
      setGenerateStatus('Done!');
      setTimeout(() => setShowGenerate(false), 1000);
    } catch (error) {
      setGenerateStatus(`Error: ${error}`);
      setTimeout(() => setShowGenerate(false), 3000);
    }
  }, [cwd, version, reload]);

  // Keyboard bindings
  useKeyboard({
    focusedPanel,
    onToggleFocus: toggleFocus,
    onTreeUp: treeUp,
    onTreeDown: treeDown,
    onTreeSelect: treeSelect,
    onContentUp: () => contentScroll.scrollUp(),
    onContentDown: () => contentScroll.scrollDown(),
    onContentPageUp: () => contentScroll.scrollUp(contentViewportHeight),
    onContentPageDown: () => contentScroll.scrollDown(contentViewportHeight),
    onGenerate: handleGenerate,
    onHelp: () => setShowHelp((prev) => !prev),
    onQuit: () => {},
  });

  // Render overlays
  if (showHelp) {
    return (
      <Box flexDirection="column" height={rows}>
        <TopBar version={version} projectName={projectName} lastGenerated={lastGenerated} />
        <HelpOverlay visible={true} />
        <BottomBar />
      </Box>
    );
  }

  if (showGenerate) {
    return (
      <Box flexDirection="column" height={rows}>
        <TopBar version={version} projectName={projectName} lastGenerated={lastGenerated} />
        <GenerateOverlay visible={true} status={generateStatus} artifact={generateArtifact} />
        <BottomBar />
      </Box>
    );
  }

  return (
    <Box flexDirection="column" height={rows}>
      <TopBar version={version} projectName={projectName} lastGenerated={lastGenerated} />
      <Box flexGrow={1}>
        <ArtifactTree
          tree={tree}
          selectedIndex={treeSelectedIndex}
          focused={focusedPanel === 'tree'}
          width={treeWidth}
        />
        <ContentViewer
          content={content}
          type={selectedEntry?.type || 'unknown'}
          title={selectedEntry?.name || '(none)'}
          focused={focusedPanel === 'content'}
          scrollOffset={contentScroll.scrollOffset}
          viewportHeight={contentViewportHeight}
        />
      </Box>
      <BottomBar />
    </Box>
  );
};

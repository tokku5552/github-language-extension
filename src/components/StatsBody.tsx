import { Box } from '@chakra-ui/react';
import parse from 'html-react-parser';
import React from 'react';

export interface StatsBodyProps {
  currentStats: string;
  currentTopLanguage: string;
}

export function StatsBody({
  currentStats,
  currentTopLanguage,
}: StatsBodyProps) {
  return (
    <>
      <Box p={4}>
        {parse(currentStats)}
        {parse(currentTopLanguage)}
      </Box>
    </>
  );
}

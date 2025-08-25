import { Box, Center, Spinner } from '@chakra-ui/react';
import parse from 'html-react-parser';
import React from 'react';

export interface StatsBodyProps {
  currentStats: string;
  currentTopLanguage: string;
  isLoading: boolean;
}

export default function StatsBody({
  currentStats,
  currentTopLanguage,
  isLoading,
}: StatsBodyProps) {
  if (isLoading) {
    return (
      <Center p={4} h="280px">
        <Spinner size="xl" />
      </Center>
    );
  }

  return (
    <>
      {currentStats && (
        <Box p={4}>
          {parse(currentStats)}
          {parse(currentTopLanguage)}
        </Box>
      )}
    </>
  );
}

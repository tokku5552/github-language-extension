import { Stats, StatsError } from '@/types/stats';
import { Box, Center, Spinner } from '@chakra-ui/react';
import React from 'react';
import ErrorState from '../ErrorState';
import StatsCard from '../StatsCard';
import TopLangsCard from '../TopLangsCard';

export interface StatsBodyProps {
  stats?: Stats;
  error?: StatsError;
  isLoading: boolean;
}

export default function StatsBody({ stats, error, isLoading }: StatsBodyProps) {
  if (isLoading) {
    return (
      <Center p={4} h="280px">
        <Spinner size="xl" />
      </Center>
    );
  }

  if (error) {
    return <ErrorState error={error} />;
  }

  if (!stats) {
    return null;
  }

  return (
    <Box p={4}>
      <StatsCard stats={stats} />
      <TopLangsCard
        languages={stats.languages}
        languageUnit={stats.languageUnit}
      />
    </Box>
  );
}

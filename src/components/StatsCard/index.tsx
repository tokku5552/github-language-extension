import { StatsSource } from '@/types/enums';
import { Stats } from '@/types/stats';
import {
  Box,
  Circle,
  Flex,
  Heading,
  SimpleGrid,
  Text,
  useColorModeValue,
} from '@chakra-ui/react';
import React from 'react';

export interface StatsCardProps {
  stats: Stats;
}

interface StatRow {
  label: string;
  value: number;
}

const formatNumber = (value: number): string => value.toLocaleString('en-US');

export default function StatsCard({ stats }: StatsCardProps) {
  const borderColor = useColorModeValue('gray.200', 'whiteAlpha.300');
  const labelColor = useColorModeValue('gray.600', 'gray.400');
  const accent = '#4299E1';

  const rows: StatRow[] = [{ label: 'Total Stars Earned', value: stats.stars }];
  if (stats.commits !== undefined) {
    rows.push({ label: 'Total Commits', value: stats.commits });
  }
  if (stats.prs !== undefined) {
    rows.push({ label: 'Total PRs', value: stats.prs });
  }
  if (stats.issues !== undefined) {
    rows.push({ label: 'Total Issues', value: stats.issues });
  }
  if (stats.contributedTo !== undefined) {
    rows.push({ label: 'Contributed to', value: stats.contributedTo });
  }
  rows.push({ label: 'Public Repositories', value: stats.publicRepos });
  rows.push({ label: 'Followers', value: stats.followers });

  return (
    <Box
      borderWidth="1px"
      borderColor={borderColor}
      borderRadius="md"
      p={4}
      data-testid="stats-card"
    >
      <Flex align="center" justify="space-between" mb={3}>
        <Heading as="h4" size="sm" color={accent} isTruncated>
          {stats.name}&apos;s GitHub Stats
        </Heading>
        {stats.rank && (
          <Circle
            size="52px"
            borderWidth="2px"
            borderColor={accent}
            data-testid="rank-circle"
          >
            <Text fontWeight="bold" color={accent}>
              {stats.rank.level}
            </Text>
          </Circle>
        )}
      </Flex>

      <SimpleGrid columns={2} spacingX={6} spacingY={1}>
        {rows.map((row) => (
          <React.Fragment key={row.label}>
            <Text fontSize="sm" color={labelColor}>
              {row.label}
            </Text>
            <Text fontSize="sm" fontWeight="bold" textAlign="right">
              {formatNumber(row.value)}
            </Text>
          </React.Fragment>
        ))}
      </SimpleGrid>

      {stats.source === StatsSource.REST && (
        <Text fontSize="xs" color={labelColor} mt={3}>
          Commits, PRs, issues and rank need a personal access token.
        </Text>
      )}
    </Box>
  );
}

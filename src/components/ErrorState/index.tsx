import { StatsErrorType } from '@/types/enums';
import { StatsError } from '@/types/stats';
import {
  Alert,
  AlertDescription,
  AlertIcon,
  AlertTitle,
  Box,
} from '@chakra-ui/react';
import React from 'react';

export interface ErrorStateProps {
  error: StatsError;
}

const formatResetTime = (resetAt?: Date): string =>
  resetAt
    ? ` The limit resets at ${resetAt.toLocaleTimeString()}.`
    : ' Try again later.';

const describe = (
  error: StatsError
): { title: string; description: string } => {
  switch (error.type) {
    case StatsErrorType.NOT_FOUND:
      return {
        title: 'User not found',
        description: 'GitHub has no user with that name.',
      };
    case StatsErrorType.RATE_LIMITED:
      return {
        title: 'Rate limit reached',
        description: `Anonymous requests are limited to 60 per hour.${formatResetTime(
          error.resetAt
        )} Saving a personal access token in the options page raises this to 5,000.`,
      };
    case StatsErrorType.UNAUTHORIZED:
      return {
        title: 'Token rejected',
        description:
          'GitHub rejected the saved personal access token. Update it in the options page.',
      };
    default:
      return {
        title: 'Could not load stats',
        description:
          'The GitHub API could not be reached. Check your connection and try again.',
      };
  }
};

export default function ErrorState({ error }: ErrorStateProps) {
  const { title, description } = describe(error);
  return (
    <Box p={4}>
      <Alert status="error" borderRadius="md" alignItems="flex-start">
        <AlertIcon />
        <Box>
          <AlertTitle fontSize="sm">{title}</AlertTitle>
          <AlertDescription fontSize="sm">{description}</AlertDescription>
        </Box>
      </Alert>
    </Box>
  );
}

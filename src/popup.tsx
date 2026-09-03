import { fetchStats, getGitHubUsername } from '@/api';
import { Header, StatsBody, StatsForm } from '@/components';
import { getCachedStats, getToken, setCachedStats } from '@/storage';
import { StatsErrorType, StatsSource } from '@/types/enums';
import { Stats, StatsError } from '@/types/stats';
import { Box, ChakraProvider, Link, Text } from '@chakra-ui/react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { useForm } from 'react-hook-form';

export const Popup = () => {
  const [username, setUsername] = useState('');
  const [stats, setStats] = useState<Stats>();
  const [error, setError] = useState<StatsError>();
  const [isLoading, setIsLoading] = useState(false);
  const [hasToken, setHasToken] = useState(true);
  const { register, setValue, handleSubmit, formState } = useForm<FormData>();
  /**
   * Name of the most recent lookup, so that a repeated effect run - StrictMode
   * mounts the popup twice - cannot spend a second request from the 60/hour
   * anonymous budget. Keyed by name rather than by an in-flight flag because
   * the duplicate pass can land after the first request has already settled.
   */
  const requestedFor = useRef('');

  const onSubmit = handleSubmit((data) => {
    setUsername(data['username']);
  });

  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const currentURL = tabs[0]?.url || '';
      const name = getGitHubUsername(currentURL);
      setUsername(name);
      setValue('username', name);
    });
  }, []);

  const loadStats = useCallback(async (name: string) => {
    if (requestedFor.current === name) {
      return;
    }
    requestedFor.current = name;
    setIsLoading(true);
    setError(undefined);
    try {
      const token = await getToken();
      setHasToken(!!token);
      const source = token ? StatsSource.GRAPHQL : StatsSource.REST;

      const cached = await getCachedStats(name, source);
      if (cached) {
        setStats(cached);
        return;
      }

      const fresh = await fetchStats(name, token || undefined);
      setStats(fresh);
      await setCachedStats(fresh);
    } catch (caught) {
      setStats(undefined);
      setError(
        caught instanceof StatsError
          ? caught
          : new StatsError(
              StatsErrorType.NETWORK,
              'Could not load stats from GitHub.'
            )
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (username !== '') {
      loadStats(username);
    }
  }, [username, loadStats]);

  const openOptions = () => {
    chrome.runtime?.openOptionsPage?.();
  };

  return (
    <Box w="540px">
      <Header />
      <StatsBody stats={stats} error={error} isLoading={isLoading} />
      <StatsForm
        onSubmit={onSubmit}
        register={register}
        formState={formState}
      />
      {!hasToken && (
        <Text fontSize="xs" pb={3} pl={4} pr={4}>
          <Link color="#4299E1" onClick={openOptions}>
            Add a personal access token
          </Link>{' '}
          to include commits, PRs, issues, rank and private contributions.
        </Text>
      )}
    </Box>
  );
};

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <ChakraProvider>
        <Popup />
      </ChakraProvider>
    </React.StrictMode>
  );
}

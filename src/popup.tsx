import { fetchStats, getGitHubUsername } from '@/api';
import { GITHUB_OAUTH_CLIENT_ID } from '@/config';
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
  // Undefined until the stored token has been read, so the prompt does not
  // flash on every popup open.
  const [hasToken, setHasToken] = useState<boolean>();
  const { register, setValue, handleSubmit, formState } = useForm<FormData>();
  /**
   * Name of the newest lookup. It serves two purposes: a repeated effect run
   * for the same name is skipped rather than spending a second request from
   * the 60/hour anonymous budget, and every state write is checked against it
   * so a slow response for a name the user has already moved on from is
   * discarded instead of overwriting the newer one.
   */
  const latestRequest = useRef('');

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
    // Read here rather than only inside a lookup: on a non-GitHub tab there is
    // no username to look up, and the prompt would never appear.
    getToken().then((token) => setHasToken(!!token));
  }, []);

  const loadStats = useCallback(async (name: string) => {
    if (latestRequest.current === name) {
      return;
    }
    latestRequest.current = name;
    const isCurrent = () => latestRequest.current === name;
    setIsLoading(true);
    setError(undefined);
    try {
      const token = await getToken();
      if (!isCurrent()) {
        return;
      }
      const source = token ? StatsSource.GRAPHQL : StatsSource.REST;

      const cached = await getCachedStats(name, source);
      if (!isCurrent()) {
        return;
      }
      if (cached) {
        setStats(cached);
        return;
      }

      const fresh = await fetchStats(name, token || undefined);
      if (!isCurrent()) {
        return;
      }
      setStats(fresh);
      await setCachedStats(fresh);
    } catch (caught) {
      if (!isCurrent()) {
        return;
      }
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
      if (isCurrent()) {
        setIsLoading(false);
      }
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
      {hasToken === false && (
        <Text fontSize="xs" pb={3} pl={4} pr={4}>
          <Link color="#4299E1" onClick={openOptions}>
            {GITHUB_OAUTH_CLIENT_ID === ''
              ? 'Add a personal access token'
              : 'Sign in with GitHub'}
          </Link>{' '}
          to include commits, PRs, issues and rank.
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

import { getGitHubStats, getGitHubTopLanguage, getGitHubUsername } from '@/api';
import { Header, StatsBody, StatsForm } from '@/components';
import { ThemeType } from '@/types/enums';
import { Box, ChakraProvider, useColorMode } from '@chakra-ui/react';
import React, { useCallback, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { useForm } from 'react-hook-form';

export const Popup = () => {
  const [username, setUsername] = useState('');
  const [currentStats, setCurrentStats] = useState('');
  const [currentTopLanguage, setCurrentTopLanguage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { colorMode } = useColorMode();
  const { register, setValue, handleSubmit, formState } = useForm<FormData>();

  const onSubmit = handleSubmit((data) => {
    setUsername(data['username']);
  });

  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const currentURL = tabs[0].url || '';
      const name = getGitHubUsername(currentURL);
      setUsername(name);
      setValue('username', name);
    });
  }, []);

  const fetchStats = useCallback(
    async (username: string) => {
      setIsLoading(true);
      try {
        const themeType =
          colorMode === 'light' ? ThemeType.LIGHT : ThemeType.DARK;
        const stats = await getGitHubStats(username, themeType);
        const lang = await getGitHubTopLanguage(username, themeType);
        setCurrentTopLanguage(lang.data);
        setCurrentStats(stats.data);
      } catch (error) {
        console.error('Failed to fetch stats:', error);
        setCurrentTopLanguage('');
        setCurrentStats('');
      } finally {
        setIsLoading(false);
      }
    },
    [colorMode]
  );

  useEffect(() => {
    const fetch = async (username: string) => {
      const themeType =
        colorMode === 'light' ? ThemeType.LIGHT : ThemeType.DARK;
      const stats = await getGitHubStats(username, themeType);
      const lang = await getGitHubTopLanguage(username, themeType);
      setCurrentTopLanguage(lang.data);
      setCurrentStats(stats.data);
    };
    if (username !== '') {
      fetch(username);
    }
  }, [username, fetchStats]);

  return (
    <>
      <Box w="540px">
        <Header />
        <StatsBody
          currentStats={currentStats}
          currentTopLanguage={currentTopLanguage}
          isLoading={isLoading}
        />
        <StatsForm
          onSubmit={onSubmit}
          register={register}
          formState={formState}
        />
      </Box>
    </>
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

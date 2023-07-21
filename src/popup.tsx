import { getGitHubStats, getGitHubTopLanguage, getGitHubUsername } from '@/api';
import { Header, StatsBody, StatsForm } from '@/components';
import { ThemeType } from '@/types/enums';
import { Box, ChakraProvider, useColorMode } from '@chakra-ui/react';
import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { useForm } from 'react-hook-form';

const Popup = () => {
  const [username, setUsername] = useState('');
  const [currentStats, setCurrentStats] = useState('');
  const [currentTopLanguage, setCurrentTopLanguage] = useState('');
  const { colorMode } = useColorMode();
  const { register, setValue, handleSubmit, formState } = useForm<FormData>();

  const onSubmit = handleSubmit((data) => {
    console.log(data['username']);
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

  useEffect(() => {
    const fetch = async (username: string) => {
      const themeType =
        colorMode === 'light' ? ThemeType.LIGHT : ThemeType.DARK;
      const stats = await getGitHubStats(username, themeType);
      const lang = await getGitHubTopLanguage(username, themeType);
      setCurrentTopLanguage(lang.data);
      setCurrentStats(stats.data);
    };
    console.log(username);
    if (username !== '') {
      console.log(username);
      fetch(username);
    }
  }, [username, colorMode, currentStats, currentTopLanguage]);

  return (
    <>
      <Box w="540px">
        <Header />
        <StatsBody
          currentStats={currentStats}
          currentTopLanguage={currentTopLanguage}
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

const container = document.createElement('root');
const root = createRoot(container);
root.render(
  <React.StrictMode>
    <ChakraProvider>
      <Popup />
    </ChakraProvider>
  </React.StrictMode>
);

import { StatsBody } from '@/components/StatsBody';
import { StatsForm } from '@/components/StatsForm';
import { ThemeType } from '@/types/enums';
import { Box, ChakraProvider, useColorMode } from '@chakra-ui/react';
import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { useForm } from 'react-hook-form';
import {
  getGitHubStats,
  getGitHubTopLanguage,
  getGitHubUsername,
} from './api/githubReadmeStats';
import Header from './components/Header';

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

ReactDOM.render(
  <React.StrictMode>
    <ChakraProvider>
      <Popup />
    </ChakraProvider>
  </React.StrictMode>,
  document.getElementById('root')
);

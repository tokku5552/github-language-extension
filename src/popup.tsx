import {
  Box,
  Button,
  ChakraProvider,
  FormControl,
  FormErrorMessage,
  FormLabel,
  Input,
} from '@chakra-ui/react';
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
  const {
    register,
    setValue,
    handleSubmit,
    formState,
    formState: { errors },
  } = useForm<FormData>();

  const onSubmit = handleSubmit((data) => {
    console.log(data['username']);
    setUsername(data['username']);
  });

  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      const currentURL = tabs[0].url || '';
      const name = getGitHubUsername(currentURL);
      setUsername(name);
      setValue('username', name);
    });
  }, []);

  useEffect(() => {
    const fetch = async (username: string) => {
      const stats = await getGitHubStats(username);
      const lang = await getGitHubTopLanguage(username);
      setCurrentTopLanguage(lang.data);
      setCurrentStats(stats.data);
    };
    console.log(username);
    if (username !== '') {
      console.log(username);
      fetch(username);
    }
  }, [username]);

  return (
    <>
      <ChakraProvider>
        <Box w="540px">
          <Header>GitHub Language Stats Extension</Header>
          <Box p={4}>
            <div dangerouslySetInnerHTML={{ __html: currentStats }} />
            <div dangerouslySetInnerHTML={{ __html: currentTopLanguage }} />
          </Box>
          <Box pb={2} pl={4} pr={4}>
            <form onSubmit={onSubmit}>
              <FormControl
                id="username"
                isInvalid={!!errors.username}
                isRequired
              >
                <FormLabel>GitHub username</FormLabel>
                <Input
                  placeholder="GitHub username"
                  {...register('username', { required: true })}
                />
                <FormErrorMessage>
                  {errors.username && 'GitHub username is required'}
                </FormErrorMessage>
              </FormControl>
              <Button
                mt={2}
                bg="#4299E1"
                color="white"
                isLoading={formState.isSubmitting}
                type="submit"
              >
                Submit
              </Button>
            </form>
          </Box>
        </Box>
      </ChakraProvider>
    </>
  );
};

ReactDOM.render(
  <React.StrictMode>
    <Popup />
  </React.StrictMode>,
  document.getElementById('root')
);

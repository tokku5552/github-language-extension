import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import axios from "axios";
import { useForm } from "react-hook-form";
import { Button, Input } from "@chakra-ui/react"
import { ChakraProvider } from "@chakra-ui/react"
import { FormErrorMessage, FormLabel, FormControl } from '@chakra-ui/react'

type FormData = {
  username: string;
};

const getGitHubStats = (username: string) => {
  return axios.get<string>(
    `https://github-readme-stats.vercel.app/api?username=${username}&count_private=true&show_icons=true`
  );
};

const getGitHubTopLanguage = (username: string) => {
  return axios.get<string>(
    `https://github-readme-stats.vercel.app/api/top-langs/?username=${username}&layout=compact`
  );
};

const getGitHubUsername = (url: string): string => {
  try {
    const urlObj = new URL(url);
    console.log(urlObj.hostname);
    if (urlObj.hostname === "github.com") {
      return urlObj.pathname.split("/")[1];
    }
  } catch { }

  return "";
};

const Popup = () => {
  const [username, setUsername] = useState("");
  const [currentStats, setCurrentStats] = useState("");
  const [currentTopLanguage, setCurrentTopLanguage] = useState("");
  const {
    register,
    setValue,
    handleSubmit,
    formState,
    formState: { errors },
  } = useForm<FormData>();

  const onSubmit = handleSubmit((data) => {
    console.log(data["username"]);
    setUsername(data["username"]);
  });

  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      const currentURL = tabs[0].url || "";
      const name = getGitHubUsername(currentURL);
      setUsername(name);
      setValue("username", name);
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
    if (username !== "") {
      console.log(username);
      fetch(username);
    }
  }, [username]);

  return (
    <>
      <ChakraProvider>
        <h1>GitHub Language Stats Extension</h1>
        <div dangerouslySetInnerHTML={{ __html: currentStats }} />
        <div dangerouslySetInnerHTML={{ __html: currentTopLanguage }} />
        <form onSubmit={onSubmit}>
          <FormControl id="username" isInvalid={!!errors.username} isRequired>
            <FormLabel>GitHub username</FormLabel>
            <Input placeholder="GitHub username" {...register('username', { required: true })} />
            <FormErrorMessage>{errors.username && 'GitHub username is required'}</FormErrorMessage>
          </FormControl>
          <Button mt={4} colorScheme="teal" disabled={!formState.isValid} isLoading={formState.isSubmitting} type="submit">Submit</Button>
        </form>
      </ChakraProvider>
    </>
  );
};

ReactDOM.render(
  <React.StrictMode>
    <Popup />
  </React.StrictMode>,
  document.getElementById("root")
);

import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import axios, { AxiosResponse } from "axios";
import { useForm } from "react-hook-form";

type FormData = {
  username: string;
};

const Popup = () => {
  const [username, setUsername] = useState<string>("");
  const [currentStats, setCurrentStats] = useState<AxiosResponse>();
  const [currentTopLanguage, setCurrentTopLanguage] = useState<AxiosResponse>();
  const {
    register,
    setValue,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>();

  const onSubmit = handleSubmit((data) => {
    console.log(data["username"]);
    setUsername(data["username"]);
  });

  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      const currentURL = tabs[0].url as string;
      const name = getGitHubUsername(currentURL) as string;
      setUsername(name);
      setValue("username", name);
    });
  }, []);

  useEffect(() => {
    const fetch = async (username: string) => {
      const stats = await getGitHubStats(username);
      const lang = await getGitHubTopLanguage(username);
      setCurrentTopLanguage(lang);
      setCurrentStats(stats);
    };
    console.log(username);
    if (username !== "" && username !== undefined) {
      console.log(username);
      fetch(username);
    }
  }, [username]);

  const getGitHubStats = async (username: string) => {
    const response = await axios.get(
      `https://github-readme-stats.vercel.app/api?username=${username}&count_private=true&show_icons=true`
    );
    return response;
  };

  const getGitHubTopLanguage = async (username: string) => {
    const response = await axios.get(
      `https://github-readme-stats.vercel.app/api/top-langs/?username=${username}&layout=compact`
    );
    return response;
  };

  const getGitHubUsername = (url: string) => {
    const urlObj = new URL(url);
    console.log(urlObj.hostname);
    if (urlObj.hostname === "github.com") {
      return urlObj.pathname.split("/")[1];
    }
  };

  return (
    <>
      <h1>GitHub Language Stats Extension</h1>
      <div dangerouslySetInnerHTML={{ __html: currentStats?.data }} />
      <div dangerouslySetInnerHTML={{ __html: currentTopLanguage?.data }} />
      <form onSubmit={onSubmit}>
        <label>GitHub username </label>
        <input {...register("username")} placeholder="GitHub username" />
        <input type="submit" />
      </form>
    </>
  );
};

ReactDOM.render(
  <React.StrictMode>
    <Popup />
  </React.StrictMode>,
  document.getElementById("root")
);

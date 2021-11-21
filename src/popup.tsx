import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import axios, { AxiosResponse } from "axios";
import { useForm } from "react-hook-form";

type FormData = {
  username: string;
};

const Popup = () => {
  const [currentURL, setCurrentURL] = useState<string>();
  const [username, setUsername] = useState<string>("tokku5552");
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
      setCurrentURL(tabs[0].url);
    });
    const getData = async (username: string) => {
      const stats = await getGitHubStats(username);
      const lang = await getGitHubTopLanguage(username);
      setCurrentTopLanguage(lang);
      setCurrentStats(stats);
    };
    getData(username);
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

  return (
    <>
      <ul style={{ minWidth: "700px" }}>
        <li>Current URL: {currentURL}</li>
      </ul>
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

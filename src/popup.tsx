import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import axios from "axios";
import { useForm } from "react-hook-form";

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

const getGitHubUsername = (url: string) => {
  const urlObj = new URL(url);
  console.log(urlObj.hostname);
  if (urlObj.hostname === "github.com") {
    return urlObj.pathname.split("/")[1];
  }
};

const Popup = () => {
  const [username, setUsername] = useState("");
  const [currentStats, setCurrentStats] = useState("");
  const [currentTopLanguage, setCurrentTopLanguage] = useState("");
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
      setCurrentTopLanguage(lang.data);
      setCurrentStats(stats.data);
    };
    console.log(username);
    if (username !== "" && username !== undefined) {
      console.log(username);
      fetch(username);
    }
  }, [username]);

  return (
    <>
      <h1>GitHub Language Stats Extension</h1>
      <div dangerouslySetInnerHTML={{ __html: currentStats }} />
      <div dangerouslySetInnerHTML={{ __html: currentTopLanguage }} />
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

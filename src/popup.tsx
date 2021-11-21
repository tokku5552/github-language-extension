import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import axios, { AxiosResponse } from "axios";

const Popup = () => {
  const [currentURL, setCurrentURL] = useState<string>();
  const [currentStats, setCurrentStats] = useState<AxiosResponse>();
  const [currentTopLanguage, setCurrentTopLanguage] = useState<AxiosResponse>();

  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      setCurrentURL(tabs[0].url);
    });
    const getData = async () => {
      const stats = await getGitHubStats();
      const lang = await getGitHubTopLanguage();
      setCurrentTopLanguage(lang);
      setCurrentStats(stats);
    };
    getData();
  }, []);

  const getGitHubStats = async () => {
    const response = await axios.get(
      "https://github-readme-stats.vercel.app/api?username=anuraghazra"
    );
    return response;
  };

  const getGitHubTopLanguage = async () => {
    const response = await axios.get(
      "https://github-readme-stats.vercel.app/api/top-langs/?username=anuraghazra&layout=compact"
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
      {/* <button onClick={changeBackground}>change background</button> */}
    </>
  );
};

ReactDOM.render(
  <React.StrictMode>
    <Popup />
  </React.StrictMode>,
  document.getElementById("root")
);

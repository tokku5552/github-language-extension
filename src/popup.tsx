import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import axios, { AxiosResponse } from "axios";

const Popup = () => {
  const [currentURL, setCurrentURL] = useState<string>();
  const [currentStats, setCurrentStats] = useState<AxiosResponse>();

  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      setCurrentURL(tabs[0].url);
    });
    const getData = async () => {
      const res = await getGitHubStats();
      console.log(res.data);
      // const resp = res.data;
      setCurrentStats(res);
    };
    getData();
  }, []);

  const changeBackground = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      const tab = tabs[0];
      if (tab.id) {
        chrome.tabs.sendMessage(
          tab.id,
          {
            color: "#555505",
          },
          (msg) => {
            console.log("result message:", msg);
          }
        );
      }
    });
  };

  const getGitHubStats = async () => {
    const response = await axios.get(
      "https://github-readme-stats.vercel.app/api?username=anuraghazra"
    );
    return response;
  };

  return (
    <>
      <ul style={{ minWidth: "700px" }}>
        <li>Current URL: {currentURL}</li>
        <li>Current Time: {new Date().toLocaleTimeString()}</li>
      </ul>
      <div dangerouslySetInnerHTML={{ __html: currentStats?.data }} />
      <button onClick={changeBackground}>change background</button>
    </>
  );
};

ReactDOM.render(
  <React.StrictMode>
    <Popup />
  </React.StrictMode>,
  document.getElementById("root")
);

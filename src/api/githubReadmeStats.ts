import axios from "axios";

export const getGitHubStats = (username: string) => {
  return axios.get<string>(
    `https://github-readme-stats.vercel.app/api?username=${username}&count_private=true&show_icons=true`
  );
};

export const getGitHubTopLanguage = (username: string) => {
  return axios.get<string>(
    `https://github-readme-stats.vercel.app/api/top-langs/?username=${username}&layout=compact`
  );
};

export const getGitHubUsername = (url: string): string => {
  try {
    const urlObj = new URL(url);
    console.log(urlObj.hostname);
    if (urlObj.hostname === "github.com") {
      return urlObj.pathname.split("/")[1];
    }
  } catch {}

  return "";
};

import axios from 'axios';
import { ThemeType } from '../types/enums';

const darkthemeParam = 'theme=algolia';

export const getGitHubStats = (username: string, themeType: ThemeType) => {
  const url =
    themeType === ThemeType.LIGHT
      ? `https://github-readme-stats.vercel.app/api?username=${username}&count_private=true&show_icons=true`
      : `https://github-readme-stats.vercel.app/api?username=${username}&count_private=true&show_icons=true&${darkthemeParam}`;
  return axios.get<string>(url);
};

export const getGitHubTopLanguage = (
  username: string,
  themeType: ThemeType
) => {
  const url =
    themeType === ThemeType.LIGHT
      ? `https://github-readme-stats.vercel.app/api/top-langs/?username=${username}&layout=compact`
      : `https://github-readme-stats.vercel.app/api/top-langs/?username=${username}&layout=compact&${darkthemeParam}`;
  return axios.get<string>(url);
};

export const getGitHubUsername = (url: string): string => {
  try {
    const urlObj = new URL(url);
    console.log(urlObj.hostname);
    if (urlObj.hostname === 'github.com') {
      return urlObj.pathname.split('/')[1];
    }
  } catch {
    //
  }

  return '';
};

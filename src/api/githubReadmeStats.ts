import { ThemeType } from '@/types/enums';
import axios from 'axios';

const darkthemeParam = 'theme=algolia';

export const getGitHubStats = (username: string, themeType: ThemeType) => {
  const encodedUsername = encodeURIComponent(username);
  const url =
    themeType === ThemeType.LIGHT
      ? `https://github-readme-stats.vercel.app/api?username=${encodedUsername}&count_private=true&show_icons=true`
      : `https://github-readme-stats.vercel.app/api?username=${encodedUsername}&count_private=true&show_icons=true&${darkthemeParam}`;
  return axios.get<string>(url);
};

export const getGitHubTopLanguage = (
  username: string,
  themeType: ThemeType
) => {
  const encodedUsername = encodeURIComponent(username);
  const url =
    themeType === ThemeType.LIGHT
      ? `https://github-readme-stats.vercel.app/api/top-langs/?username=${encodedUsername}&layout=compact`
      : `https://github-readme-stats.vercel.app/api/top-langs/?username=${encodedUsername}&layout=compact&${darkthemeParam}`;
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

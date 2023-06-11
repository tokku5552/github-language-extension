import { ThemeType } from '@/types/enums';
import axios from 'axios';
import {
  getGitHubStats,
  getGitHubTopLanguage,
  getGitHubUsername,
} from './githubReadmeStats';

jest.mock('axios');
const axiosMock = axios as jest.Mocked<typeof axios>;

describe('githubReadmeStats', () => {
  beforeEach(() => {
    axiosMock.get.mockClear();
  });

  test.each([
    {
      username: 'test_user',
      themeType: ThemeType.LIGHT,
      expectedUrl:
        'https://github-readme-stats.vercel.app/api?username=test_user&count_private=true&show_icons=true',
      expectedResult: { data: 'test' },
    },
    {
      username: 'test_user',
      themeType: ThemeType.DARK,
      expectedUrl:
        'https://github-readme-stats.vercel.app/api?username=test_user&count_private=true&show_icons=true&theme=algolia',
      expectedResult: { data: 'test' },
    },
  ])(
    'getGitHubStats with username=%s and themeType=%s',
    async ({ username, themeType, expectedUrl, expectedResult }) => {
      axiosMock.get.mockResolvedValueOnce(expectedResult);
      const result = await getGitHubStats(username, themeType);
      expect(result).toStrictEqual(expectedResult);
      expect(axiosMock.get).toHaveBeenCalledWith(expectedUrl);
    }
  );

  test.each([
    {
      username: 'test_user',
      themeType: ThemeType.LIGHT,
      expectedUrl:
        'https://github-readme-stats.vercel.app/api/top-langs/?username=test_user&layout=compact',
      expectedResult: { data: 'test' },
    },
    {
      username: 'test_user',
      themeType: ThemeType.DARK,
      expectedUrl:
        'https://github-readme-stats.vercel.app/api/top-langs/?username=test_user&layout=compact&theme=algolia',
      expectedResult: { data: 'test' },
    },
  ])(
    'getGitHubTopLanguage with username=%s and themeType=%s',
    async ({ username, themeType, expectedUrl, expectedResult }) => {
      axiosMock.get.mockResolvedValueOnce(expectedResult);
      const result = await getGitHubTopLanguage(username, themeType);
      expect(result).toStrictEqual(expectedResult);
      expect(axiosMock.get).toHaveBeenCalledWith(expectedUrl);
    }
  );

  test.each([
    {
      url: 'https://github.com/user',
      expectedResult: 'user',
    },
    {
      url: 'invalid-url',
      expectedResult: '',
    },
    {
      url: 'https://example.com',
      expectedResult: '',
    },
  ])('getGitHubUsername with url=%s', ({ url, expectedResult }) => {
    const result = getGitHubUsername(url);
    expect(result).toBe(expectedResult);
  });
});

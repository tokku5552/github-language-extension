export const ThemeType = {
  LIGHT: 'light',
  DARK: 'dark',
} as const;

export type ThemeType = (typeof ThemeType)[keyof typeof ThemeType];

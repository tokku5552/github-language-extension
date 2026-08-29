import React, { createContext, useContext, useMemo, useState } from 'react';

export type ColorMode = 'light' | 'dark';

export interface ThemeColors {
  bg: string;
  text: string;
}

export interface ThemeContextValue {
  colorMode: ColorMode;
  toggleColorMode: () => void;
  colors: ThemeColors;
}

const lightColors: ThemeColors = { bg: '#FFFFFF', text: '#1A202C' };
const darkColors: ThemeColors = { bg: '#1A202C', text: '#FFFFFF' };

export const getThemeColors = (colorMode: ColorMode): ThemeColors =>
  colorMode === 'dark' ? darkColors : lightColors;

const defaultValue: ThemeContextValue = {
  colorMode: 'light',
  toggleColorMode: () => undefined,
  colors: lightColors,
};

const ThemeContext = createContext<ThemeContextValue>(defaultValue);

const getInitialColorMode = (): ColorMode => {
  if (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  ) {
    return 'dark';
  }
  return 'light';
};

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [colorMode, setColorMode] = useState<ColorMode>(getInitialColorMode);

  const value = useMemo<ThemeContextValue>(
    () => ({
      colorMode,
      toggleColorMode: () =>
        setColorMode((prev) => (prev === 'light' ? 'dark' : 'light')),
      colors: getThemeColors(colorMode),
    }),
    [colorMode]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};

export const useColorMode = (): ThemeContextValue => useContext(ThemeContext);

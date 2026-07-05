import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';

export const lightColors = {
  primary: '#00685f',
  surface: '#f5faf8',
  surfaceContainerLow: '#f0f5f2',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerHigh: '#e4e9e7',
  onSurface: '#171d1c',
  onSurfaceVariant: '#3d4947',
  outline: '#6d7a77',
  border: 'rgba(109,122,119,0.18)',
  borderCard: 'rgba(109,122,119,0.15)',
  cardShadowOpacity: 0.06,
};

export const darkColors = {
  primary: '#6bd8cb',
  surface: '#111918',
  surfaceContainerLow: '#192320',
  surfaceContainerLowest: '#1e2b29',
  surfaceContainerHigh: '#2a3533',
  onSurface: '#e1e8e6',
  onSurfaceVariant: '#b5c3c1',
  outline: '#8a9795',
  border: 'rgba(255,255,255,0.1)',
  borderCard: 'rgba(255,255,255,0.08)',
  cardShadowOpacity: 0.0,
};

export type ThemeColors = typeof lightColors;

interface ThemeContextValue {
  isDark: boolean;
  colors: ThemeColors;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  isDark: false,
  colors: lightColors,
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [isDark, setIsDark] = useState(systemScheme === 'dark');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('@theme_override').then(val => {
      if (val === 'dark') setIsDark(true);
      else if (val === 'light') setIsDark(false);
      else setIsDark(systemScheme === 'dark');
      setLoaded(true);
    });
  }, []);

  const toggleTheme = async () => {
    const next = !isDark;
    setIsDark(next);
    await AsyncStorage.setItem('@theme_override', next ? 'dark' : 'light');
  };

  if (!loaded) return <>{children}</>;

  return (
    <ThemeContext.Provider value={{ isDark, colors: isDark ? darkColors : lightColors, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

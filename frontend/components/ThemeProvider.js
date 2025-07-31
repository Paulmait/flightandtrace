import React, { createContext, useContext, useState } from 'react';
import { lightTheme, darkTheme, accentColors } from '../styles/theme';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [dark, setDark] = useState(false);
  const [accent, setAccent] = useState(accentColors[0]);
  const theme = dark ? darkTheme : lightTheme;
  return (
    <ThemeContext.Provider value={{ theme, dark, setDark, accent, setAccent }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

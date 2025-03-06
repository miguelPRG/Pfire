import { createContext, useState, useContext, ReactNode, useEffect, useMemo } from "react";
import { ThemeProvider, CssBaseline, createTheme } from "@mui/material";
import { lightTheme, darkTheme } from "../assets/Theme";

interface TemaContextProps {
  darkMode: boolean;
  toggleTheme: () => void;
}

const TemaContext = createContext<TemaContextProps | undefined>(undefined);

export const useTema = () => {
  const context = useContext(TemaContext);
  if (!context) {
    throw new Error("useTema deve ser usado dentro de um TemaProvider");
  }
  return context;
};

export function TemaProvider({ children }: { children: ReactNode }) {
  const getInitialDarkMode = () => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("darkMode") === "true";
    }
    return false;
  };

  const [darkMode, setDarkMode] = useState<boolean>(getInitialDarkMode);
  const [isChangingTheme, setIsChangingTheme] = useState(false);

  // Memoriza o tema para evitar recriações desnecessárias
  const theme = useMemo(() => createTheme(darkMode ? darkTheme : lightTheme), [darkMode]);

  // Aplica a cor do fundo diretamente no body para evitar flash branco
  useEffect(() => {
    document.body.style.backgroundColor = darkMode
      ? darkTheme.palette.background.default
      : lightTheme.palette.background.default;
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem("darkMode", String(darkMode));
  }, [darkMode]);

  const toggleTheme = () => {
    setIsChangingTheme(true);
    setDarkMode((prevMode) => !prevMode);
    setTimeout(() => setIsChangingTheme(false), 5);// Delay para evitar flash. Mais conforto para o utilizador.
  };

  return (
    <TemaContext.Provider value={{ darkMode, toggleTheme }}>
      {!isChangingTheme && (
        <ThemeProvider theme={theme}>
          <CssBaseline />
          {children}
        </ThemeProvider>
      )}
    </TemaContext.Provider>
  );
}
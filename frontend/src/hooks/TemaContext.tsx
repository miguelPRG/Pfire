import { createContext, useState, useContext, ReactNode, useEffect, useMemo } from "react";
import { ThemeProvider, CssBaseline } from "@mui/material";
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
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem("darkMode") === "true"; // Recupera do localStorage
  });

  // Memoriza o tema para evitar recriações desnecessárias
  const theme = useMemo(() => (darkMode ? darkTheme : lightTheme), [darkMode]);

  useEffect(() => {
    // Sempre que darkMode mudar, salva no localStorage
    localStorage.setItem("darkMode", String(darkMode));
    // Aplica a classe no HTML para customização global
    document.documentElement.classList.toggle("dark-mode", darkMode);
  }, [darkMode]);

  const toggleTheme = () => {
    setDarkMode((prevMode) => !prevMode);
  };

  return (
    <TemaContext.Provider value={{ darkMode, toggleTheme }}>
      <ThemeProvider theme={theme}>
        <CssBaseline /> {/* Força a aplicação do tema imediatamente */}
        {children}
      </ThemeProvider>
    </TemaContext.Provider>
  );
}

import {
  createContext,
  useContext,
  ReactNode,
  useState,
} from "react";
import { ThemeProvider, CssBaseline, createTheme } from "@mui/material";
import { lightTheme, darkTheme } from "../assets/Theme";

interface TemaContextProps {
  darkMode: boolean;
  toggleTheme: () => void;
  isChanging: boolean;
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
    // Recupera o estado inicial do tema do localStorage
    return localStorage.getItem("darkMode") === "true";
  });

  // Armazena o tema atual sem causar re-renderizações
  const [theme, setTheme] = useState(createTheme(darkMode ? darkTheme : lightTheme));

  // Estado para indicar se o tema está a ser alterado
  const [isChanging, setIsChanging] = useState(false);

  const toggleTheme = () => {
    // Ativa o estado de transição
    setIsChanging(true);

    // Alterna o tema
    setDarkMode((prevMode) => {
      const newMode = !prevMode;

      // Atualiza o tema imediatamente
      setTheme(createTheme(newMode ? darkTheme : lightTheme));

      // Salva o estado do tema no localStorage
      localStorage.setItem("darkMode", String(newMode));

      // Aplica uma transição suave ao body
      document.body.style.transition = "background-color 0.3s ease";
      document.body.style.backgroundColor = newMode
        ? darkTheme.palette.background.default
        : lightTheme.palette.background.default;

      return newMode;
    });

    // Finaliza o estado de transição após a duração da animação
    setTimeout(() => {
      setIsChanging(false);
    }, 300); // Tempo da transição (0.3s)
  };

  return (
    <TemaContext.Provider value={{ darkMode, toggleTheme, isChanging }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </TemaContext.Provider>
  );
}


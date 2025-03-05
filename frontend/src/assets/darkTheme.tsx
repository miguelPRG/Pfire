import { createTheme, ThemeProvider } from "@mui/material/styles";
import { CssBaseline } from "@mui/material";
import commonComponents from "./themeComponents";

const darkTheme = createTheme({
    palette: {
        mode: "dark",
        primary: { main: "#0A192F" }, // Azul escuro com tons de petróleo
        secondary: { main: "#00C8FF" }, // Azul neon vibrante
        error: { main: "#FF4C4C" }, // Vermelho claro
        warning: { main: "#FF9F00" }, // Laranja dourado
        success: { main: "#39B54A" }, // Verde limão brilhante
        background: { default: "#121212", paper: "#1D1D1D" }, // Preto com cinza escuro
        text: { primary: "#F1F1F1", secondary: "#B0B0B0" }, // Texto branco suave, cinza claro
      },      
    typography: {
        fontFamily: '"Inter", "Roboto", sans-serif',
        h1: { fontFamily: '"Poppins", sans-serif', fontSize: "2rem", fontWeight: 600, color: "#E0E0E0" },
        h2: { fontFamily: '"Poppins", sans-serif', fontSize: "1.5rem", fontWeight: 500, color: "#E0E0E0" },
    },

    components: commonComponents 
});


const DarkThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <ThemeProvider theme={darkTheme}>
        <CssBaseline/>
        {children}
    </ThemeProvider>
);

export default DarkThemeProvider;
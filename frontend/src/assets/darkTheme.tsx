import { createTheme, ThemeProvider } from "@mui/material/styles";
import { CssBaseline } from "@mui/material";
import commonComponents from "./themeComponents";

const darkTheme = createTheme({
    palette: {
        mode: "dark",
        primary: { main: "#1E3A5F" }, // Azul escuro principal
        secondary: { main: "#FF9800" }, // Laranja queimado para contraste
        error: { main: "#E57373" }, // Vermelho suave
        warning: { main: "#FBC02D" }, // Amarelo menos vibrante
        success: { main: "#81C784" }, // Verde equilibrado
        background: { 
            default: "linear-gradient(to bottom, #1E3A5F, #0F1C3F)", // Degradê azul escuro profundo
            paper: "#1E1E1E", // Cinza grafite para seções elevadas
        },
        text: { primary: "#E0E0E0", secondary: "#B0BEC5" }, // Texto branco suave
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
        <CssBaseline />
        {children}
    </ThemeProvider>
);

export default DarkThemeProvider;
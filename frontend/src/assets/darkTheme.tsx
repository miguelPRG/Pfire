import { createTheme, ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import commonComponents from './themeComponents';

const darkTheme = createTheme({
    palette: {
        mode: 'dark',
        primary: { main: '#90CAF9' }, //Azul claro
        secondary: { main: '#FFB74D' }, //Laranja claro
        error: { main: '#EF5350' }, //Vermelho
        warning: { main: '#FFCA28' }, //Amarelo
        success: { main: '#66BB6A' }, //Verde
        background: { default: '#1A1A1A', paper: '#242424' }, //Cinza escuro
        text: { primary: '#E0E0E0', secondary: '#B0BEC5' }, //Cinza claro
    },
    typography: {
        fontFamily: '"Inter", "Roboto", sans-serif',
        h1: { fontFamily: '"Poppins", sans-serif', fontSize: '2rem' },
        h2: { fontFamily: '"Poppins", sans-serif', fontSize: '1.5rem' },
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
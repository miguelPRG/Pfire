import { createTheme, ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import commonComponents from './themeComponents';

const lightTheme = createTheme({
    palette: {
        mode: 'light',
        primary: { main: '#1976D2' }, //Azul médio
        secondary: { main: '#FF9800' }, //Laranja
        error: { main: '#D32F2F' }, //Vermelho escuro
        warning: { main: '#FFA000' }, //Amarelo
        success: { main: '#388E3C' }, //Verde escuro
        background: { default: '#ECEFF1', paper: '#FFFFFF' }, //Cinza claro
        text: { primary: '#212121', secondary: '#757575' }, //Cinza escuro
    },
    typography: {
        fontFamily: '"Inter", "Roboto", sans-serif',
        h1: { fontFamily: '"Poppins", sans-serif', fontSize: '2rem' },
        h2: { fontFamily: '"Poppins", sans-serif', fontSize: '1.5rem' },
    },

    components: commonComponents 
});


const LightThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <ThemeProvider theme={lightTheme}>
        <CssBaseline/>
        {children}
    </ThemeProvider>
);

export default LightThemeProvider;
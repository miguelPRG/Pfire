import { Container, Typography, Paper, TextField, Button, Alert, Fade } from '@mui/material';
import { useRef, useState } from 'react';
import { useAuth } from '../hooks/AuthContext';
import PersonOutlineOutlinedIcon from '@mui/icons-material/PersonOutlineOutlined';
import { Box } from "@mui/material";
import GoogleIcon from '@mui/icons-material/Google';


function LoginPage() {
    const emailRef = useRef<HTMLInputElement>(null);
    const passwordRef = useRef<HTMLInputElement>(null);
    const [isLoading, setLoading] = useState(false);
    const [authError, setAuthError] = useState(false);
    const { login, loginWithOAuth} = useAuth();

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault(); // Evita o recarregamento da página
        setAuthError(false);

        const email = emailRef.current?.value;
        const password = passwordRef.current?.value;

        if (!email || !password) return; // O próprio navegador já lida com a validação do email

        setLoading(true);

        try {
            await new Promise((resolve) => setTimeout(resolve, 1000)); // Simular atraso
            await login(email, password);
        } catch (error) {
            console.error(error);
            setAuthError(true);
        } finally {
            setLoading(false);
        }
    };

    const handleOAuthLogin = async (provider: "google" | "facebook" | "microsoft") => {
        try {
            setLoading(true);
            setAuthError(false);
            await new Promise((resolve) => setTimeout(resolve, 1000));
            await loginWithOAuth(provider);
        } catch (error) {
            console.error(`Erro no login com ${provider}:`, error);
            setAuthError(true);
        } finally {
            setLoading(false);
        }
      };    

    return (
        <Container maxWidth="sm" sx={{ textAlign: 'center', mt: 4 }}>
            {/* Mensagem de erro com animação */}
            <Fade in={authError}>
                <Alert variant="filled" severity="error" sx={{ mt: 4 }}>
                    Email ou Password Inválidos
                </Alert>
            </Fade>

            <Paper elevation={6}>
                <Typography variant="h1" sx={{ marginBottom: 2 }}>Faça Login na sua Conta</Typography>
                <form onSubmit={handleSubmit}>
                    <TextField required id="email" label="Email" type="email" inputRef={emailRef} sx={{ mb: 2 }} />
                    <TextField required id="password" label="Password" type="password" inputRef={passwordRef} sx={{ mb: 2 }} />
                    <Button fullWidth variant="contained" type="submit" disabled={isLoading}>
                        Login
                    </Button>
                </form>
            </Paper>
        </Container>
    );
}

export default LoginPage;

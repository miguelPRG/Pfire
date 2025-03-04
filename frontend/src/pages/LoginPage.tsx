import { Container, Typography, Paper, TextField, Button, Alert, Fade, InputAdornment } from '@mui/material';
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
    const { login, loginWithOAuth } = useAuth();

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setAuthError(false);

        const email = emailRef.current?.value;
        const password = passwordRef.current?.value;

        if (!email || !password) return;

        setLoading(true);

        try {
            await new Promise((resolve) => setTimeout(resolve, 1000));
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
        <Container maxWidth="sm" sx={{ textAlign: 'center', mt: 4, backgroundColor: "background.default", padding: 4, borderRadius: 2 }}>
            <Fade in={authError}>
                <Alert variant="filled" severity="error" sx={{ mt: 2 }}>
                    Email ou Password Inválidos
                </Alert>
            </Fade>
            <Box sx={{
                position: "relative",  
                marginBottom: 3 // Ajusta conforme necessário
            }}>
                <Box sx={{ 
                    backgroundColor: "primary.main",
                    borderRadius: "50%", 
                    width: 70, // Tamanho fixo para garantir que seja circular
                    height: 70, 
                    position: "absolute", 
                    top: "-15px", // Move para cima do Paper
                    zIndex: 1 // Garante que fique sobre o Paper
                }}>
                    <PersonOutlineOutlinedIcon sx={{ fontSize: 48, color: "#FFFFFF" }} />
                </Box>
            </Box>
            <Paper elevation={6} sx={{ 
                maxWidth: '400px', // Define uma largura máxima
            }}>
                <Typography 
                    variant="h1" 
                    sx={{ marginBottom: 2, marginTop: 2 }}>
                    INICIAR SESSÃO
                </Typography>

                <form onSubmit={handleSubmit}>
                    <TextField  
                        required 
                        id="email" 
                        label="Email" 
                        type="email" 
                        inputRef={emailRef} 
                    />
                    <TextField 
                        required 
                        id="password" 
                        label="Password" 
                        type="password" 
                        inputRef={passwordRef} 
                    />
                    <Box >
                        <Typography
                            component="a" 
                            href="#" 
                            sx={{ 
                                color: '#1976D2', 
                                textDecoration: 'none', 
                                fontSize: '0.900rem', 
                                fontWeight: 500, 
                                cursor: 'pointer',
                                '&:hover': { textDecoration: 'underline' } 
                            }}>
                            Esqueceste-te da tua palavra-passe?
                        </Typography>
                    </Box>

                    <Button
                        type="submit"
                        disabled={isLoading}
                        sx={{
                            background: 'linear-gradient(45deg, #FFA726 30%, #FB8C00 90%)',
                            color: 'white',
                            fontWeight: 'bold',
                            marginTop: 4,
                            transition: '0.3s',
                            '&:hover': {
                                background: 'linear-gradient(45deg, #FB8C00 30%, #FFA726 90%)'
                            },
                        }}>
                        INICIAR SESSÃO
                    </Button>
                    <Button
                        startIcon={<GoogleIcon />}
                        sx={{
                            backgroundColor: '#000000',
                            color: 'white',
                            transition: '0.3s',
                            mt: 2,
                            '&:hover': {
                                backgroundColor: 'primary.main'
                            },
                        }}>
                        Login com Google
                    </Button>
                    <Button
                    fullWidth
                    variant="contained"
                    startIcon={<GoogleIcon />}
                    sx={{
                        background: '#000000',
                        color: 'white',
                        fontWeight: 'bold',
                        padding: '10px 20px',
                        borderRadius: '6px',
                        transition: '0.3s',
                        mt: 2,
                        '&:hover': {
                            background: '#1976D2'
                        },
                        width: { xs: '250px', sm: '300px', md: '350px' },
                    }}
                >
                    Login com Google
                </Button>

                </form>
            </Paper>
        </Container>
    );
}

export default LoginPage;
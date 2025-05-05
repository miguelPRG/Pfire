import {
  Container,
  Typography,
  Paper,
  TextField,
  Button,
  Alert,
  Fade,
  Box,
  Divider,
} from "@mui/material";
import { useRef, useState } from "react";
import { useAuth } from "../hooks/AuthContext";
import { Link } from "react-router-dom"; // Importa o Link do react-router-dom
//Importar imagens
import microsoft from "../assets/images/microsoft.png";
import google from "../assets/images/google.png";
import logo from "../assets/images/logo.png";
import { useNavigate } from "react-router-dom";

function LoginPage() {
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const [isLoading, setLoading] = useState(false);
  const [authError, setAuthError] = useState(false);
  const { login, loginWithOAuth } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthError(false);

    const email = emailRef.current?.value;
    const password = passwordRef.current?.value;

    if (!email || !password) return;

    setLoading(true);

    try {
      await login(email, password);
    } catch (error) {
      console.error(error);
      setAuthError(true);
      if (emailRef.current) emailRef.current.value = "";
      if (passwordRef.current) passwordRef.current.value = "";
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthLogin = async (
    provider: "google" | "facebook" | "microsoft",
  ) => {
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
    <Container
      maxWidth="sm"
      sx={{
        textAlign: "center",
        mt: 4,
        padding: 4,
        borderRadius: 2,
      }}
    >
      {/* Logo e nome da aplicação no topo */}

      <Fade in={authError}>
        <Alert variant="filled" severity="error" sx={{ mt: 2 }}>
          Email ou Password Inválidos
        </Alert>
      </Fade>

      <Box
        sx={{
          position: "relative",
          marginBottom: 3, // Ajusta conforme necessário
        }}
      >
        <Box
          sx={{
            backgroundColor: "primary.main",

            borderRadius: "50%",
            width: 70, // Tamanho fixo para garantir que seja circular
            height: 70,
            position: "absolute",
            top: "-30px", // Move para cima do Paper
            zIndex: 1, // Garante que fique sobre o Paper
          }}
        >
          <img
            src={logo} // Imagem importada da logo
            alt="Logo"
            style={{
              width: "100px", // Ajuste o tamanho da logo
              height: "100px",
            }}
          />
        </Box>
      </Box>

      <Paper
        elevation={6}
        sx={{
          maxWidth: "400px", // Define uma largura máxima
        }}
      >
        <Typography variant="h1" sx={{ marginBottom: 2, marginTop: 2 }}>
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
          <Box>
            <Typography
              component="a"
              href="#"
              onClick={() => navigate("/forgot-password")}
              sx={{
                color: "primary.main",
                textDecoration: "none",
                fontSize: "0.900rem",
                cursor: "pointer",
                "&:hover": { textDecoration: "underline" },
              }}
            >
              Esqueceste-te da tua palavra-passe?
            </Typography>
          </Box>

          <Button
            type="submit"
            disabled={isLoading}
            sx={{
              background: "linear-gradient(45deg, #FFA726 30%, #FB8C00 90%)",
              color: "white",
              fontWeight: "bold",
              marginTop: 4,
              transition: "0.3s",
              "&:hover": {
                background: "linear-gradient(45deg, #FB8C00 30%, #FFA726 90%)",
              },
            }}
          >
            INICIAR SESSÃO
          </Button>

          {/* Linha Horizontal */}
          <Divider sx={{ width: "100%", my: 2 }} />
          <Typography variant="h3">ou</Typography>
          <Box
            sx={{
              display: "flex", // Garante que os botões fiquem na mesma linha
              justifyContent: "center", // Centraliza os botões horizontalmente
              gap: 1, // Espaçamento entre os botões
              mt: 0.5, // Margem superior
            }}
          >
            {/* Botão do Google */}
            <Button
              sx={{
                display: "flex", // Garante que o conteúdo interno seja flexível
                alignItems: "center", // Centraliza verticalmente o conteúdo
                backgroundColor: "#FFFFFF",
                color: "white",
                transition: "0.3s",
                px: 2, // Padding horizontal
                py: 1.1, // Padding vertical
                width: "200px", // Largura padronizada
                border: "1px solid #B0B0B0",
                "&:hover": { backgroundColor: "background.default" },
              }}
            >
              <img
                src={google} // Imagem importada do Facebook
                alt="Google Logo"
                style={{
                  width: 21, // Tamanho padronizado da imagem
                  height: 21,
                  marginRight: 8, // Espaçamento entre a imagem e o texto
                }}
              />
            </Button>

            {/* Botão do Microsoft */}
            <Button
              sx={{
                display: "flex", // Garante que o conteúdo interno seja flexível
                alignItems: "center", // Centraliza verticalmente o conteúdo
                backgroundColor: "#FFFFFF",
                color: "white",
                transition: "0.3s",
                px: 1.7, // Padding horizontal
                py: 0.9, // Padding vertical
                width: "200px", // Largura padronizada
                border: "1px solid #B0B0B0", // Borda cinza ao redor do botão
                "&:hover": {
                  backgroundColor: "background.default",
                },
              }}
            >
              <img
                src={microsoft} // Imagem importada do Microsoft
                alt="Microsoft Logo"
                style={{
                  width: 24, // Tamanho padronizado da imagem
                  height: 24,
                  marginRight: 8, // Espaçamento entre a imagem e o texto
                }}
              />
            </Button>
          </Box>
          <Typography variant="h4" sx={{ fontSize: "0.900rem" }}>
            Não tens uma conta?{" "}
            <Link
              to="/register"
              style={{ color: "#1976D2", textDecoration: "none" }}
            >
              Regista-te
            </Link>
          </Typography>
        </form>
      </Paper>
    </Container>
  );
}

export default LoginPage;

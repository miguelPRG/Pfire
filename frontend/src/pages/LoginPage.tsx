import { Container, Typography, Paper, TextField, Button, Alert, Fade, Box, Divider } from "@mui/material";
import { useState } from "react";
import { useAuth } from "../hooks/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation } from "react-router-dom";
// Importar imagens
import microsoft from "../assets/images/microsoft.png";
import google from "../assets/images/google.png";
import logo from "../assets/images/logo.png";

// Definir o esquema de validação com Zod
const loginSchema = z.object({
  email: z.string().nonempty("O email é obrigatório").email("Email inválido"),
  password: z.string().nonempty("A password é obrigatória"),
});

type LoginFormInputs = z.infer<typeof loginSchema>;

function LoginPage() {
  const { login, loginWithOAuth } = useAuth();
  const navigate = useNavigate();
  const [authError, setAuthError] = useState({
    error: false,
    message: "",
  });
  const location = useLocation();
  const userConfirmation = location.state;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }, // Adicionado isSubmitting
  } = useForm<LoginFormInputs>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormInputs) => {
    setAuthError({ error: false, message: "" });

    try {
      await login(data.email, data.password);
      navigate("/");
    } catch (error: any) {
      
      reset({
        email: "",
        password: ""
      })
      
      setAuthError({
        error: true,
        message: error.message,
      });

    }
  };

  const handleOAuthLogin = async (provider: "google" | "microsoft") => {
    setAuthError({ error: false, message: "" });

    try {
      await loginWithOAuth(provider);
    } catch (error: any) {
      setAuthError({
        error: true,
        message: error?.message || "Erro ao tentar autenticar com o provedor.",
      });
    }
  };

  return (
    <Container
      maxWidth="sm"
      sx={{
        textAlign: "center",
        padding: 4,
        borderRadius: 2,
      }}
    >
      {/* Exibir erro de autenticação */}
      <Fade in={authError.error} timeout={{ enter: 800, exit: 800 }} unmountOnExit>
        <Alert variant="filled" severity="error" sx={{ mt: -3 }}>
          {authError.message}
        </Alert>
      </Fade>
      {userConfirmation && userConfirmation.isConfirmed ? (
        <Fade
          in={userConfirmation.isConfirmed && userConfirmation.message}
          timeout={{
            enter: 800,
            exit: 800,
          }}
          unmountOnExit
        >
          <Alert
            variant="filled"
            severity="success"
            sx={{
              mt: -3,
            }}
          >
            {userConfirmation.message}
          </Alert>
        </Fade>
      ) : (
        userConfirmation?.message && (
          <Fade
            in={userConfirmation.message}
            timeout={{
              enter: 800,
              exit: 800,
            }}
            unmountOnExit
          >
            <Alert
              variant="filled"
              severity="error"
              sx={{
                mt: -3,
              }}
            >
              {userConfirmation.message}
            </Alert>
          </Fade>
        )
      )}
      <Box
        sx={{
          position: "relative",
          marginBottom: 8,
        }}
      >
        <Box
          sx={{
            backgroundColor: "primary.main",
            borderRadius: "50%",
            width: 70,
            height: 70,
            position: "absolute",
            top: "-30px",
            zIndex: 1,
            marginTop: 5,
          }}
        >
          <img
            src={logo}
            alt="Logo"
            style={{
              width: "100px",
              height: "100px",
            }}
          />
        </Box>
      </Box>

      <Paper
        elevation={6}
        sx={{
          maxWidth: "400px",
        }}
      >
        <Typography
          variant="h1"
          sx={{
            marginBottom: 2,
            marginTop: 2,
          }}
        >
          INICIAR SESSÃO
        </Typography>

        <form onSubmit={handleSubmit(onSubmit)}>
          <TextField
            {...register("email")}
            id="email"
            label="Email*"
            error={!!errors.email}
            helperText={errors.email?.message}
            fullWidth
            margin="normal"
          />
          <TextField
            {...register("password")}
            id="password"
            label="Password*"
            type="password"
            error={!!errors.password}
            helperText={errors.password?.message}
            fullWidth
            margin="normal"
          />
          <Box>
            <Typography
              component="a"
              onClick={() => navigate("/forgot-password")}
              sx={{
                color: "primary.main",
                textDecoration: "none",
                fontSize: "0.900rem",
                cursor: "pointer",
                "&:hover": {
                  textDecoration: "underline",
                },
              }}
            >
              Esqueceste-te da tua palavra-passe?
            </Typography>
          </Box>

          <Button
            type="submit"
            disabled={isSubmitting} // Botão desativado enquanto o formulário está sendo enviado
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
          <Divider />
          <Typography variant="body1">ou</Typography>
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              gap: 1,
              mt: 0.5,
            }}
          >
            {/* Botão do Google */}
            <Button
              onClick={() => handleOAuthLogin("google")}
              sx={{
                display: "flex",
                alignItems: "center",
                backgroundColor: "#FFFFFF",
                color: "white",
                transition: "0.3s",
                px: 2,
                py: 1.1,
                width: "200px",
                border: "1px solid #B0B0B0",
                "&:hover": {
                  backgroundColor: "background.default",
                },
              }}
            >
              <img
                src={google}
                alt="Google Logo"
                style={{
                  width: 21,
                  height: 21,
                  marginRight: 8,
                }}
              />
            </Button>

            {/* Botão do Microsoft */}
            <Button
              onClick={() => handleOAuthLogin("microsoft")}
              sx={{
                display: "flex",
                alignItems: "center",
                backgroundColor: "#FFFFFF",
                color: "white",
                transition: "0.3s",
                px: 1.7,
                py: 0.9,
                width: "200px",
                border: "1px solid #B0B0B0",
                "&:hover": {
                  backgroundColor: "background.default",
                },
              }}
            >
              <img
                src={microsoft}
                alt="Microsoft Logo"
                style={{
                  width: 24,
                  height: 24,
                  marginRight: 8,
                }}
              />
            </Button>
          </Box>
          <Typography variant="body1">
            Não tens uma conta? <Link to="/register">Regista-te</Link>
          </Typography>
        </form>
      </Paper>
    </Container>
  );
}

export default LoginPage;

import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Container,
  Typography,
  Paper,
  TextField,
  Button,
  Box,
  Divider,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { useAuth } from "../hooks/AuthContext";
import google from "../assets/images/google.png";
import facebook from "../assets/images/facebook.png";
import microsoft from "../assets/images/microsoft.png";
import logo from "../assets/images/logo.png";

declare global {
  interface Window {
    grecaptcha: any;
  }
}

function RegisterPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const navigate = useNavigate();
  const { registerUser } = useAuth();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmPasswordRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const telefoneRef = useRef<HTMLInputElement>(null);
  const empresaNameRef = useRef<HTMLInputElement>(null);
  const nifRef = useRef<HTMLInputElement>(null);
  const localidadeRef = useRef<HTMLInputElement>(null);
  const moradaRef = useRef<HTMLInputElement>(null);
  const codigoPostalRef = useRef<HTMLInputElement>(null);

  const handleRegister = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (passwordRef.current?.value !== confirmPasswordRef.current?.value) {
      setError("As senhas não coincidem!");
      return;
    }

    const user = {
      nome: nameRef.current?.value || "",
      email: emailRef.current?.value || "",
      telefone: telefoneRef.current?.value || "",
      password: passwordRef.current?.value || "",
    };

    const empresa = {
      nome: empresaNameRef.current?.value || "",
      nif: nifRef.current?.value || "",
      localidade: localidadeRef.current?.value || "",
      morada: moradaRef.current?.value || "",
      codigo_postal: codigoPostalRef.current?.value || "",
      telefone: telefoneRef.current?.value || "",
    };

    try {
      setLoading(true);

      const payload = {
        user,
        empresa,
      };

      await registerUser(payload);
      alert("Conta criada com sucesso! Verifique seu email.");
      navigate("/login");
    } catch (err) {
      setError("Erro no registo. Tente novamente.");
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
        backgroundColor: "background.default",
        padding: 4,
        borderRadius: 2,
      }}
    >
      <Box sx={{ position: "relative", marginBottom: 3 }}>
        <Box
          sx={{
            backgroundColor: "primary.main",
            borderRadius: "50%",
            width: 70,
            height: 70,
            position: "absolute",
            top: "10px",
            zIndex: 1,
          }}
        >
          <img
            src={logo}
            alt="Logo"
            style={{ width: "100px", height: "100px" }}
          />
        </Box>
      </Box>

      <Paper elevation={6} sx={{ maxWidth: "1000px", p: isMobile ? 2 : 4 }}>
        <Typography variant="h1" sx={{ marginBottom: 2, marginTop: 2 }}>
          CRIAR CONTA COM
        </Typography>

        <Box
          sx={{ display: "flex", justifyContent: "center", gap: 1, mt: 0.5 }}
        >
          <Button
            onClick={() => navigate("/cadastro-empresa")}
            sx={{
              display: "flex",
              alignItems: "center",
              backgroundColor: "#FFFFFF",
              px: 1.7,
              py: 0.7,
              width: "200px",
              border: "1px solid #B0B0B0",
              "&:hover": { backgroundColor: "background.default" },
            }}
          >
            <img
              src={google}
              alt="Google Logo"
              style={{ width: 28, height: 28, marginRight: 8 }}
            />
          </Button>
          <Button
            onClick={() => navigate("/cadastro-empresa")}
            sx={{
              display: "flex",
              alignItems: "center",
              backgroundColor: "primary.main",
              color: "white",
              px: 1,
              py: 0.45,
              width: "200px",
              "&:hover": { backgroundColor: "primary.dark" },
            }}
          >
            <img
              src={facebook}
              alt="Facebook Logo"
              style={{ width: 55, height: 40, marginRight: 2 }}
            />
          </Button>
          <Button
            onClick={() => navigate("/cadastro-empresa")}
            sx={{
              display: "flex",
              alignItems: "center",
              backgroundColor: "#FFFFFF",
              px: 1.7,
              py: 0.7,
              width: "200px",
              border: "1px solid #B0B0B0",
              "&:hover": { backgroundColor: "background.default" },
            }}
          >
            <img
              src={microsoft}
              alt="Microsoft Logo"
              style={{ width: 33, height: 33, marginRight: 8 }}
            />
          </Button>
        </Box>

        <Divider sx={{ width: "100%", my: 2 }}>
          <Typography variant="body1" sx={{ px: 2, color: "gray" }}>
            ou
          </Typography>
        </Divider>

        <form onSubmit={handleRegister}>
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 1,
              padding: 0,
              marginBottom: "-20px",
              marginTop: "-20px",
            }}
          >
            <Typography
              variant="h1"
              sx={{ fontSize: "1.1rem", marginBottom: "4px" }}
            >
              Cria uma conta com teu Email
            </Typography>

            {/* Nome e Email */}
            {isMobile ? (
              <>
                <TextField
                  required
                  id="name"
                  label="Nome"
                  type="text"
                  inputRef={nameRef}
                />
                <TextField
                  required
                  id="email"
                  label="Email"
                  type="email"
                  inputRef={emailRef}
                />
              </>
            ) : (
              <Box
                sx={{
                  display: "flex",
                  gap: 0.3,
                  width: "100%",
                  marginBottom: "-15px",
                }}
              >
                <TextField
                  required
                  id="name"
                  label="Nome"
                  type="text"
                  sx={{ flex: 1 }}
                  inputRef={nameRef}
                />
                <TextField
                  required
                  id="email"
                  label="Email"
                  type="email"
                  inputRef={emailRef}
                  sx={{ flex: 1 }}
                />
              </Box>
            )}

            {/* Senha e Confirmar Senha */}
            {isMobile ? (
              <>
                <TextField
                  required
                  id="password"
                  label="Senha"
                  type="password"
                  inputRef={passwordRef}
                />
                <TextField
                  required
                  id="confirm-password"
                  label="Confirmar senha"
                  type="password"
                  inputRef={confirmPasswordRef}
                />
              </>
            ) : (
              <Box
                sx={{
                  display: "flex",
                  gap: 0.3,
                  width: "100%",
                  marginBottom: "-15px",
                }}
              >
                <TextField
                  required
                  id="password"
                  label="Senha"
                  type="password"
                  sx={{ flex: 1, width: "100%", margin: 0 }}
                  inputRef={passwordRef}
                />
                <TextField
                  required
                  id="confirm-password"
                  label="Confirmar senha"
                  type="password"
                  sx={{ flex: 1, width: "100%", margin: 0 }}
                  inputRef={confirmPasswordRef}
                />
              </Box>
            )}

            <Typography
              variant="h1"
              sx={{ fontSize: "1.1rem", marginTop: "8px", marginBottom: "4px" }}
            >
              Insira os dados da Empresa
            </Typography>

            {/* Nome da Empresa */}
            {isMobile ? (
              <TextField
                required
                id="empresaName"
                label="Nome da empresa"
                type="text"
                inputRef={empresaNameRef}
                fullWidth
              />
            ) : (
              <Box
                sx={{
                  display: "flex",
                  gap: 2,
                  width: "100%",
                  marginBottom: "-15px",
                  marginTop: "-15px",
                }}
              >
                <TextField
                  required
                  id="empresaName"
                  label="Nome da empresa"
                  inputRef={empresaNameRef}
                  type="text"
                  sx={{ flex: 1 }}
                />
              </Box>
            )}

            {/* NIF e Localidade */}
            {isMobile ? (
              <>
                <TextField
                  required
                  id="nif"
                  label="NIF da empresa"
                  type="text"
                  inputRef={nifRef}
                />
                <TextField
                  required
                  id="localidade"
                  label="Localidade"
                  type="text"
                  inputRef={localidadeRef}
                />
              </>
            ) : (
              <Box
                sx={{
                  display: "flex",
                  gap: 0.5,
                  width: "100%",
                  marginBottom: "-15px",
                }}
              >
                <TextField
                  required
                  id="nif"
                  label="NIF da empresa"
                  type="text"
                  inputRef={nifRef}
                  sx={{ flex: 1, width: "100%", margin: 0 }}
                />
                <TextField
                  required
                  id="localidade"
                  label="Localidade"
                  type="text"
                  inputRef={localidadeRef}
                  sx={{ flex: 1, width: "100%", margin: 0 }}
                />
              </Box>
            )}

            {/* Morada e Código Postal */}
            {isMobile ? (
              <>
                <TextField
                  required
                  id="morada"
                  label="Morada"
                  type="text"
                  inputRef={moradaRef}
                />
                <TextField
                  required
                  id="codigo_postal"
                  label="Código postal"
                  type="text"
                  inputRef={codigoPostalRef}
                />
              </>
            ) : (
              <Box sx={{ display: "flex", gap: 0.5, width: "100%" }}>
                <TextField
                  required
                  id="morada"
                  label="Morada"
                  type="text"
                  inputRef={moradaRef}
                  sx={{ flex: 1, width: "100%", margin: 0 }}
                />
                <TextField
                  required
                  id="codigo_postal"
                  label="Código postal"
                  type="text"
                  inputRef={codigoPostalRef}
                  sx={{ flex: 1, width: "100%", margin: 0 }}
                />
              </Box>
            )}
            {/* Número de Telemóvel */}

            {isMobile ? (
              <>
                <TextField
                  required
                  id="telefone"
                  label="Número de telemóvel"
                  type="text"
                  inputRef={telefoneRef}
                />
              </>
            ) : (
              <Box sx={{ display: "flex", width: "100%", marginTop: "-15px" }}>
                <TextField
                  required
                  id="telefone"
                  label="Número de telemóvel"
                  type="text"
                  inputRef={telefoneRef}
                  sx={{ flex: 1, width: "100%", margin: 0 }}
                />
              </Box>
            )}

            <Button
              type="submit"
              disabled={loading}
              sx={{
                background: "linear-gradient(45deg, #FFA726 30%, #FB8C00 90%)",
                color: "white",
                fontWeight: "bold",
                mt: 2,
                "&:hover": {
                  background:
                    "linear-gradient(45deg, #FB8C00 30%, #FFA726 90%)",
                },
              }}
            >
              {loading ? "A criar..." : "CRIAR CONTA"}
            </Button>

            {error && (
              <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                {error}
              </Typography>
            )}

            <Typography
              variant="body1"
              sx={{ mt: 2, textAlign: "center", color: "black" }}
            >
              Já tens uma conta?{" "}
              <span
                style={{
                  color: "#1877F2",
                  fontWeight: "bold",
                  cursor: "pointer",
                }}
                onClick={() => navigate("/login")}
              >
                Faça login
              </span>
            </Typography>
          </Box>
        </form>
      </Paper>
    </Container>
  );
}

export default RegisterPage;

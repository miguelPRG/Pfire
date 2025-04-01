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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle"; // ícone de sucesso
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
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);

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
      const payload = { user, empresa };
      await registerUser(payload);
      setShowSuccessDialog(true); // Mostra o popup de sucesso
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
        p: 4,
        borderRadius: 2,
      }}
    >
      <Box sx={{ position: "relative", mb: 3 }}>
        <Box
          sx={{
            backgroundColor: "primary.main",
            borderRadius: "50%",
            width: 70,
            height: 70,
            position: "absolute",
            top: "-30px",
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
        <Typography variant="h1" sx={{ mb: 2, mt: 2 }}>
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
              backgroundColor: "#FFF",
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
              style={{ width: 52, height: 35.5, marginRight: 2 }}
            />
          </Button>
          <Button
            onClick={() => navigate("/cadastro-empresa")}
            sx={{
              display: "flex",
              alignItems: "center",
              backgroundColor: "#FFF",
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
              style={{ width: 33, height: 32, marginRight: 8 }}
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
              mb: "-20px",
              mt: "-20px",
            }}
          >
            <Typography variant="h1" sx={{ fontSize: "1.1rem", mb: "4px" }}>
              Cria uma conta com teu Email
            </Typography>

            {isMobile ? (
              <>
                <TextField
                  required
                  label="Nome"
                  type="text"
                  inputRef={nameRef}
                />
                <TextField
                  required
                  label="Email"
                  type="email"
                  inputRef={emailRef}
                />
              </>
            ) : (
              <Box
                sx={{ display: "flex", gap: 0.8, width: "100%", mb: "-15px" }}
              >
                <TextField
                  required
                  label="Nome"
                  type="text"
                  sx={{ flex: 1 }}
                  inputRef={nameRef}
                />
                <TextField
                  required
                  label="Email"
                  type="email"
                  sx={{ flex: 1 }}
                  inputRef={emailRef}
                />
              </Box>
            )}

            {isMobile ? (
              <>
                <TextField
                  required
                  label="Senha"
                  type="password"
                  inputRef={passwordRef}
                />
                <TextField
                  required
                  label="Confirmar senha"
                  type="password"
                  inputRef={confirmPasswordRef}
                />
              </>
            ) : (
              <Box
                sx={{ display: "flex", gap: 0.8, width: "100%", mb: "-15px" }}
              >
                <TextField
                  required
                  label="Senha"
                  type="password"
                  sx={{ flex: 1 }}
                  inputRef={passwordRef}
                />
                <TextField
                  required
                  label="Confirmar senha"
                  type="password"
                  sx={{ flex: 1 }}
                  inputRef={confirmPasswordRef}
                />
              </Box>
            )}

            <Typography
              variant="h1"
              sx={{ fontSize: "1.1rem", mt: "8px", mb: "4px" }}
            >
              Insira os dados da Empresa
            </Typography>

            {isMobile ? (
              <TextField
                required
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
                  mb: "-15px",
                  mt: "-15px",
                }}
              >
                <TextField
                  required
                  label="Nome da empresa"
                  type="text"
                  sx={{ flex: 1 }}
                  inputRef={empresaNameRef}
                />
              </Box>
            )}

            {isMobile ? (
              <>
                <TextField
                  required
                  label="NIF da empresa"
                  type="text"
                  inputRef={nifRef}
                />
                <TextField
                  required
                  label="Localidade"
                  type="text"
                  inputRef={localidadeRef}
                />
              </>
            ) : (
              <Box
                sx={{ display: "flex", gap: 0.8, width: "100%", mb: "-15px" }}
              >
                <TextField
                  required
                  label="NIF da empresa"
                  type="text"
                  sx={{ flex: 1 }}
                  inputRef={nifRef}
                />
                <TextField
                  required
                  label="Localidade"
                  type="text"
                  sx={{ flex: 1 }}
                  inputRef={localidadeRef}
                />
              </Box>
            )}

            {isMobile ? (
              <>
                <TextField
                  required
                  label="Morada"
                  type="text"
                  inputRef={moradaRef}
                />
                <TextField
                  required
                  label="Código postal"
                  type="text"
                  inputRef={codigoPostalRef}
                />
              </>
            ) : (
              <Box sx={{ display: "flex", gap: 0.8, width: "100%" }}>
                <TextField
                  required
                  label="Morada"
                  type="text"
                  sx={{ flex: 1 }}
                  inputRef={moradaRef}
                />
                <TextField
                  required
                  label="Código postal"
                  type="text"
                  sx={{ flex: 1 }}
                  inputRef={codigoPostalRef}
                />
              </Box>
            )}

            {isMobile ? (
              <TextField
                required
                label="Número de telemóvel"
                type="text"
                inputRef={telefoneRef}
              />
            ) : (
              <Box sx={{ display: "flex", width: "100%", mt: "-15px" }}>
                <TextField
                  required
                  label="Número de telemóvel"
                  type="text"
                  sx={{ flex: 1 }}
                  inputRef={telefoneRef}
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
        <Dialog open={showSuccessDialog} onClose={() => navigate("/login")}>
          <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <CheckCircleIcon color="success" fontSize="large" />
            <Typography variant="h6" fontWeight="bold">
              Conta criada com sucesso!
            </Typography>
          </DialogTitle>

          <DialogContent>
            <Typography sx={{ mt: 1 }}>
             O teu registo foi concluído. Por favor, verifica o teu email
              para ativar a conta.
            </Typography>
          </DialogContent>

          <DialogActions sx={{ justifyContent: "center", pb: 2 }}>
            <Button
              onClick={() => navigate("/login")}
              variant="contained"
              sx={{
                background:
                  theme.palette.mode === "dark"
                    ? "linear-gradient(45deg, #43A047, #66BB6A)" // verde escuro para modo escuro
                    : "linear-gradient(45deg, #4CAF50, #81C784)", // verde claro para modo claro
                color: "#fff",
                fontWeight: "bold",
                px: 3,
                "&:hover": {
                  background:
                    theme.palette.mode === "dark"
                      ? "linear-gradient(45deg, #388E3C, #66BB6A)"
                      : "linear-gradient(45deg, #388E3C, #66BB6A)",
                },
              }}
            >
              Ir para login
            </Button>
          </DialogActions>
        </Dialog>
      </Paper>
    </Container>
  );
}

export default RegisterPage;

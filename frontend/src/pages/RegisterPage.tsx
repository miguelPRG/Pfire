import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
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
  Fade,
  Alert
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle"; // ícone de sucesso
import { useAuth } from "../hooks/AuthContext";
import google from "../assets/images/google.png";
import microsoft from "../assets/images/microsoft.png";
import logo from "../assets/images/logo.png";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import PhoneInput from "react-phone-number-input";
import 'react-phone-number-input/style.css';
import "../assets/styles/phoneNumberField.css";

// Esquema de validação com Zod
const registerSchema = z.object({
  user: z.object({
    nome: z.string().nonempty("O nome é obrigatório"),
    email: z.string().nonempty("O email é obrigatório").email("Email inválido"),
    password: z
      .string()
      .nonempty("A senha é obrigatória")
      .min(9, "A senha deve ter pelo menos 9 caracteres")
      .regex(/[A-Z]/, "A senha deve conter pelo menos uma letra maiúscula")
      .regex(/[a-z]/, "A senha deve conter pelo menos uma letra minúscula")
      .regex(/\d/, "A senha deve conter pelo menos um número"),
    confirmPassword: z.string().optional(),
  }).refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  }),
  empresa: z.object({
    nome: z.string().nonempty("O nome da empresa é obrigatório"),
    nif: z
      .string()
      .nonempty("O NIF é obrigatório")
      .regex(/^[5789]\d{8}$/, "O NIF é inválido"),
    localidade: z.string().nonempty("A localidade é obrigatória").trim(),
    morada: z.string().nonempty("A morada é obrigatória").trim(),
    codigo_postal: z
      .string()
      .nonempty("O código postal é obrigatório")
      .regex(/^\d{4}-\d{3}$/, "O código postal deve estar no formato 1234-567"),
    telefone: z
      .string()
      .nonempty("O telefone da empresa é obrigatório")
      .regex(/^\+?[0-9\s\-()]{7,15}$/, "Número de telefone inválido"),
    }),
});

type RegisterFormInputs = z.infer<typeof registerSchema>;

function RegisterPage() {
  const theme = useTheme();
  const [isRegistError, setIsRegistError] = useState({ error: false, message: "" });
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const navigate = useNavigate();
  const { registerUser } = useAuth();
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormInputs>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormInputs) => {
    setIsRegistError({ error: false, message: "" });
    try {

      delete data.user.confirmPassword; // Remove o campo confirmPassword do payload

      const payload = { user: data.user, empresa: data.empresa };
      await registerUser(payload);
      setShowSuccessDialog(true); // Mostra o popup de sucesso
    } catch (err: any) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      setIsRegistError({ error: true, message: err.message || "Ocorreu um erro ao criar a conta" });
    }
  };

  return (
    <Container
      maxWidth="sm"
      sx={{
        textAlign: "center",
        mt: 4,
        p: 4,
        borderRadius: 2,
      }}
    >
      {/* Exibir erro de registo */}
      {isRegistError.error && isRegistError.message && (
        <Fade in={isRegistError.error} timeout={800}>
          <Alert variant="filled" severity="error" sx={{ mt: -7.5 }}>
            {isRegistError.message}
          </Alert>
        </Fade>
      )}
      <Box sx={{ position: "relative", mt: 5, mb: 3 }}>
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
        <form onSubmit={handleSubmit(onSubmit)}>
          <TextField
            {...register("user.nome")}
            label="Nome*"
            error={!!errors.user?.nome}
            helperText={errors.user?.nome?.message}
            fullWidth
            margin="normal"
          />
          <TextField
            {...register("user.email")}
            label="Email*"
            error={!!errors.user?.email}
            helperText={errors.user?.email?.message}
            fullWidth
            margin="normal"
          />
          <TextField
            {...register("user.password")}
            label="Senha*"
            type="password"
            error={!!errors.user?.password}
            helperText={errors.user?.password?.message}
            fullWidth
            margin="normal"
          />
          <TextField
            {...register("user.confirmPassword")}
            label="Confirmar senha*"
            type="password"
            error={!!errors.user?.confirmPassword}
            helperText={errors.user?.confirmPassword?.message}
            fullWidth
            margin="normal"
          />
          <Typography variant="h1" sx={{ fontSize: "1.1rem", mt: "8px" }}>
            Dados da Empresa
          </Typography>
          <TextField
            {...register("empresa.nome")}
            label="Nome da empresa*"
            error={!!errors.empresa?.nome}
            helperText={errors.empresa?.nome?.message}
            fullWidth
            margin="normal"
          />
          <TextField
            {...register("empresa.nif")}
            label="NIF da empresa*"
            error={!!errors.empresa?.nif}
            helperText={errors.empresa?.nif?.message}
            fullWidth
            margin="normal"
          />
          <TextField
            {...register("empresa.localidade")}
            label="Localidade*"
            error={!!errors.empresa?.localidade}
            helperText={errors.empresa?.localidade?.message}
            fullWidth
            margin="normal"
          />
          <TextField
            {...register("empresa.morada")}
            label="Morada*"
            error={!!errors.empresa?.morada}
            helperText={errors.empresa?.morada?.message}
            fullWidth
            margin="normal"
          />
          <TextField
            {...register("empresa.codigo_postal")}
            label="Código postal*"
            error={!!errors.empresa?.codigo_postal}
            helperText={errors.empresa?.codigo_postal?.message}
            fullWidth
            margin="normal"
          />
          <div className="telefone-field">
            <Controller
              name="empresa.telefone"
              control={control}
              render={({ field }) => (
                <Box>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      border: '1px solid',
                      borderColor: errors.empresa?.telefone ? 'error.main' : 'rgba(0, 0, 0, 0.23)',
                      borderRadius: 1,
                      padding: '18.5px 14px',
                      fontSize: '16px',
                      '&:hover': {
                        borderColor: 'black',
                      },
                      '&:focus-within': {
                        borderColor: 'primary.main',
                        borderWidth: 2,
                      },
                    }}
                  >
                  <PhoneInput
                    {...field}
                    defaultCountry="PT"
                    international
                    countryCallingCodeEditable={false}
                    placeholder="Insira o número de telefone"
                    style={{
                      fontSize: '16px',
                      border: 'none',
                      outline: 'none',
                      width: '100%',
                      background: 'transparent',
                    }}
                  />
                  </Box>
                  {errors.empresa?.telefone && (
                    <Typography color="error" variant="body2" sx={{ mt: 0.5 }}>
                      {errors.empresa.telefone.message}
                    </Typography>
                  )}
                </Box>
              )}
            />
          </div>
          <Button
            type="submit"
            disabled={isSubmitting}
            sx={{
              background: "linear-gradient(45deg, #FFA726 30%, #FB8C00 90%)",
              color: "white",
              fontWeight: "bold",
              mt: 2,
              "&:hover": {
                background: "linear-gradient(45deg, #FB8C00 30%, #FFA726 90%)",
              },
            }}
          >
            {isSubmitting ? "A criar..." : "CRIAR CONTA"}
          </Button>
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
              O teu registo foi concluído. Por favor, verifica o teu email para
              ativar a conta.
            </Typography>
          </DialogContent>

          <DialogActions sx={{ justifyContent: "center", pb: 2 }}>
            <Button
              onClick={() => navigate("/login")}
              variant="contained"
              sx={{
                background:
                  theme.palette.mode === "dark"
                    ? "linear-gradient(45deg, #43A047, #66BB6A)"
                    : "linear-gradient(45deg, #4CAF50, #81C784)",
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
        <Typography variant="body1">
          Já tens uma conta?{" "}
          <Link
            to="/login"
          >
            Inicia sessão
          </Link>
        </Typography>
      </Paper>
    </Container>
  );
}

export default RegisterPage;

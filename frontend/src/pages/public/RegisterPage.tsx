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
  Alert,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "../../hooks/AuthContext";
import logo from "../../assets/images/logo.png";
import microsoftIcon from "../../assets/images/microsoft.png";
import googleIcon from "../../assets/images/google.png";
import isValidNIF from "../utils/isValidNIF";
import GlobalPhone from "../../components/GlobalPhone";
import PasswordField from "../../components/PasswordField";

const registerSchema = z.object({
  user: z
    .object({
      nome: z.string().nonempty("O nome é obrigatório"),
      email: z.string().nonempty("O email é obrigatório").email("Email inválido"),
      password: z
        .string()
        .nonempty("A senha é obrigatória")
        .min(9, "A senha deve ter pelo menos 9 caracteres")
        .regex(/[A-Z]/, "A senha deve conter pelo menos uma letra maiúscula")
        .regex(/\d/, "A senha deve conter pelo menos um número"),
      confirmPassword: z.string().optional(),
    })
    .refine((d) => d.password === d.confirmPassword, {
      message: "As senhas não coincidem",
      path: ["confirmPassword"],
    }),
  empresa: z.object({
    nome: z.string().nonempty("O nome da empresa é obrigatório"),
    nif: z
      .string()
      .nonempty("O NIF é obrigatório")
      .refine(isValidNIF, { message: "O NIF é inválido" }),
    localidade: z.string().nonempty("A localidade é obrigatória").trim(),
    morada: z.string().nonempty("A morada é obrigatória").trim(),
    codigo_postal: z
      .string()
      .nonempty("O código postal é obrigatório")
      .regex(/^\d{4}-\d{3}$/, "O código postal deve estar no formato 1234-567"),
    telefone: z
      .string({
        required_error: "Campo obrigatório",
        invalid_type_error: "Campo obrigatório",
      })
      .min(1, "Campo obrigatório")
      .regex(/^\+?[0-9\s\-()]{7,15}$/, "Número de telefone inválido"),
  }),
});

type RegisterFormInputs = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const { registerUser, loginWithOAuth } = useAuth();
  const [isRegistError, setIsRegistError] = useState({
    error: false,
    message: "",
  });
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormInputs>({
    resolver: zodResolver(registerSchema),
  });

  // 1) SUBMIT tradicional: Firebase + sendEmailVerification + backend /empresa/
  const onSubmit = async (data: RegisterFormInputs) => {
    setIsRegistError({ error: false, message: "" });
    try {
      delete data.user.confirmPassword;
      await registerUser({ user: data.user, empresa: data.empresa });
      // Abre diálogo de sucesso (o usuário deve confirmar e-mail)
      setShowSuccessDialog(true);
    } catch (err: any) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      setIsRegistError({ error: true, message: err.message });
    }
  };

  // Handler genérico para qualquer provedor
  const handleOAuth = (provider: "google" | "microsoft") => async () => {
    try {
      await loginWithOAuth(provider);
      // após login, deixamos o useEffect cuidar do redirecionamento
    } catch (e: any) {
      setIsRegistError({
        error: true,
        message: e.code === "auth/popup-closed-by-user" ? "Login cancelado pelo usuário." : e.message,
      });
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
      {isRegistError.error && isRegistError.message && (
        <Fade in timeout={800}>
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
          <img src={logo} alt="Logo" style={{ width: "100px", height: "100px" }} />
        </Box>
      </Box>

      <Paper elevation={6} sx={{ p: isMobile ? 2 : 4 }}>
        <Typography variant="h5" sx={{ mb: 2 }}>
          CRIAR CONTA COM
        </Typography>

        <Box sx={{ display: "flex", justifyContent: "center", gap: 1, mb: 2 }}>
          {/* Botão Google */}
          <Button
            onClick={handleOAuth("google")}
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
            <img src={googleIcon} alt="Google Logo" style={{ width: 32, height: 32, marginRight: 8 }} />
          </Button>
          {/* Botão Microsoft */}
          <Button
            onClick={handleOAuth("microsoft")}
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
            <img src={microsoftIcon} alt="Microsoft Logo" style={{ width: 32, height: 32, marginRight: 8 }} />
          </Button>
        </Box>

        <Divider sx={{ my: 2 }}>
          <Typography variant="body2" color="text.secondary">
            ou
          </Typography>
        </Divider>

        <form onSubmit={handleSubmit(onSubmit)}>
          {/* Campos do usuário */}
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
          <PasswordField
            {...register("user.password")}
            label="Senha*"
            error={!!errors.user?.password}
            helperText={errors.user?.password?.message}
            fullWidth
            margin="normal"
          />
          <PasswordField
            {...register("user.confirmPassword")}
            label="Confirmar senha*"
            type="password"
            error={!!errors.user?.confirmPassword}
            helperText={errors.user?.confirmPassword?.message}
            fullWidth
            margin="normal"
          />

          {/* Dados da empresa */}
          <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>
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
          <GlobalPhone fieldName="empresa.telefone" control={control} errors={errors} />
          <Button
            type="submit"
            disabled={isSubmitting}
            fullWidth
            sx={{
              mt: 2,
              background: "linear-gradient(45deg, #FFA726 30%, #FB8C00 90%)",
              color: "white",
              fontWeight: "bold",
            }}
          >
            {isSubmitting ? "A criar..." : "CRIAR CONTA"}
          </Button>
        </form>

        <Dialog open={showSuccessDialog} onClose={() => navigate("/login")}>
          <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <CheckCircleIcon color="success" fontSize="large" />
            Conta criada com sucesso!
          </DialogTitle>
          <DialogContent>
            <Typography sx={{ mt: 1 }}>
              O seu registo foi concluído. Por favor, verifique o seu email para ativar a conta.
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

        <Typography variant="body2" sx={{ mt: 2 }}>
          Já tem uma conta registada? <Link to="/login">Inicie sessão</Link>
        </Typography>
      </Paper>
    </Container>
  );
}

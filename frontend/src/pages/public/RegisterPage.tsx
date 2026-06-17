import { useState, useLayoutEffect, useEffect } from "react";
import { useNavigate, Link, useParams, useLocation } from "react-router-dom";
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

export default function RegisterPage() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const { registerUser, loginWithOAuth } = useAuth();
  const [isRegistError, setIsRegistError] = useState({
    error: false,
    message: "",
  });
  const [noCompany, setNoCompany] = useState(true);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const { GLOBAL_ID } = useParams<{ GLOBAL_ID: string }>();
  const location = useLocation();

  // Schema do usuário
  const userSchema = z
    .object({
      nome: z.string().nonempty("O nome é obrigatório").trim(),
      email: z.email("Email inválido").nonempty("O email é obrigatório").trim(),
      password: z
        .string()
        .nonempty("A senha é obrigatória")
        .min(9, "A senha deve ter pelo menos 9 caracteres")
        .regex(/[A-Z]/, "A senha deve conter pelo menos uma letra maiúscula")
        .regex(/\d/, "A senha deve conter pelo menos um número"),
      confirmPassword: z.string(),
    })
    .refine((d) => d.password === d.confirmPassword, {
      message: "As senhas não coincidem",
      path: ["confirmPassword"],
    });

  // Schema da empresa
  const empresaSchema = z.object({
    nome: z.string().nonempty("O nome da empresa é obrigatório").trim(),
    nif: z
      .string()
      .min(9, "O NIF deve ter 9 caracteres")
      .max(9, "O NIF deve ter 9 caracteres")
      .nonempty("O NIF é obrigatório")
      .trim()
      .refine(isValidNIF, { message: "O NIF é inválido" }),
    localidade: z.string().nonempty("A localidade é obrigatória").trim(),
    morada: z.string().nonempty("A morada é obrigatória").trim(),
    codigo_postal: z
      .string()
      .nonempty("O código postal é obrigatório")
      .trim()
      .regex(/^\d{4}-\d{3}$/, "O código postal deve estar no formato 1234-567"),
    telefone: z
      .string()
      .min(1, "Campo obrigatório")
      .trim()
      .regex(/^\+?[0-9\s\-()]{9,15}$/, "Número de telefone inválido"),
  });

  // Schema principal dinâmico
  const getRegisterSchema = (noCompany: boolean) =>
    z.object({
      user: userSchema,
      ...(noCompany && { empresa: empresaSchema }),
    });

  type RegisterFormInputs = z.infer<ReturnType<typeof getRegisterSchema>>;

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<RegisterFormInputs>({
    resolver: zodResolver(getRegisterSchema(noCompany)),
  });

  // Atualiza o schema do formulário quando noCompany mudar
  useEffect(() => {
    if (noCompany) {
      return;
    }

    reset(
      (prev) => ({
        ...prev,
        user: {
          ...prev.user,
          email: location.state?.email || "",
        },
      }),
      { keepValues: true }
    );
  }, [noCompany]);

  useLayoutEffect(() => {
    if (GLOBAL_ID) {
      // Se GLOBAL_ID estiver presente, temos que verificar se o email do utilizador foi fornecido pelo componente EmailOperation
      if (location.state?.email || sessionStorage.getItem("email")) {
        sessionStorage.setItem("email", location.state.email);
        location.state.email = sessionStorage.getItem("email");
        setNoCompany(false);
      }
    }
  }, []);

  // 1) SUBMIT tradicional: Firebase + sendEmailVerification + backend /empresa/
  const onSubmit = async (data: RegisterFormInputs) => {
    setIsRegistError({ error: false, message: "" });
    try {
      await registerUser({ user: data.user, empresa: data.empresa, global_id: GLOBAL_ID });
      // Abre diálogo de sucesso (o usuário deve confirmar e-mail)
      setShowSuccessDialog(true);
    } catch (err: any) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      setIsRegistError({ error: true, message: err.message });
    }
  };

  // Handler genérico para qualquer provedor
  const handleOAuth = (provider: "google" | "microsoft", global_id?: string) => async () => {
    try {
      await loginWithOAuth(provider, global_id);
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
      <Box
        sx={{
          position: "relative",
          marginBottom: 8,
        }}
      >
        <Box
          sx={{
            display: "flex",
            backgroundColor: "primary.main",
            borderRadius: "50%",
            width: 70,
            height: 70,
            position: "absolute",
            top: "-30px",
            mx: "50%",
            transform: "translateX(-50%)",
            zIndex: 1,
            marginTop: 5,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <img
            src={logo}
            alt="Logo"
            style={{
              width: "105px",
              height: "105px",
            }}
          />
        </Box>
      </Box>
      <Paper elevation={6} sx={{ p: isMobile ? 2 : 4 }}>
        <Typography variant="h5" sx={{ mb: 2 }}>
          CRIAR CONTA COM
        </Typography>

        <Box sx={{ display: "flex", justifyContent: "center", gap: 1, mb: 2 }}>
          {/* Botão Google */}
          <Button
            onClick={handleOAuth("google", GLOBAL_ID)}
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
            onClick={handleOAuth("microsoft", GLOBAL_ID)}
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
          <Typography
            variant="body2"
            sx={{
              color: "text.secondary",
            }}
          >
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
            disabled={!!location.state?.email}
            defaultValue={location.state?.email || ""}
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
          {noCompany && (
            <>
              <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>
                Dados da Empresa
              </Typography>
              <TextField
                {...register("empresa.nome")}
                label="Nome da empresa*"
                error={typeof errors.empresa === "object" && !!(errors.empresa as any)?.nome}
                helperText={typeof errors.empresa === "object" ? (errors.empresa as any)?.nome?.message : ""}
                fullWidth
                margin="normal"
              />
              <TextField
                {...register("empresa.nif")}
                label="NIF da empresa*"
                error={typeof errors.empresa === "object" && !!(errors.empresa as any)?.nif}
                helperText={typeof errors.empresa === "object" ? (errors.empresa as any)?.nif?.message : ""}
                fullWidth
                margin="normal"
              />
              <TextField
                {...register("empresa.localidade")}
                label="Localidade*"
                error={typeof errors.empresa === "object" && !!(errors.empresa as any)?.localidade}
                helperText={typeof errors.empresa === "object" ? (errors.empresa as any)?.localidade?.message : ""}
                fullWidth
                margin="normal"
              />
              <TextField
                {...register("empresa.morada")}
                label="Morada*"
                error={typeof errors.empresa === "object" && !!(errors.empresa as any)?.morada}
                helperText={typeof errors.empresa === "object" ? (errors.empresa as any)?.morada?.message : ""}
                fullWidth
                margin="normal"
              />
              <TextField
                {...register("empresa.codigo_postal")}
                label="Código postal*"
                error={typeof errors.empresa === "object" && !!(errors.empresa as any)?.codigo_postal}
                helperText={typeof errors.empresa === "object" ? (errors.empresa as any)?.codigo_postal?.message : ""}
                fullWidth
                margin="normal"
              />
              <GlobalPhone fieldName="empresa.telefone" control={control} errors={errors} />
            </>
          )}
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
        </Dialog>
        {noCompany && (
          <Typography variant="body1" sx={{ mt: 2 }}>
            Já tem uma conta registada? <Link to="/login">Inicie sessão</Link>
          </Typography>
        )}
      </Paper>
    </Container>
  );
}

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useParams, useNavigate } from "react-router-dom";
import { Alert, Box, Button, CircularProgress, Container, Typography, Paper } from "@mui/material";
import { useState, useEffect } from "react";
import PasswordField from "../../components/PasswordField";
import { usersApi } from "../../features/users/api";
import { useRecaptcha } from "../../hooks/RecaptchaContext";

const newPasswordSchema = z
  .object({
    password: z.string().min(9, "A nova palavra-passe deve ter pelo menos 9 caracteres"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As palavras-passe não coincidem",
    path: ["confirmPassword"],
  });

type NewPasswordFormInputs = z.infer<typeof newPasswordSchema>;

export default function NewPasswordPage() {
  const { GLOBAL_ID } = useParams<{ GLOBAL_ID: string }>();
  const navigate = useNavigate();
  const { generateToken } = useRecaptcha();
  const [isValidating, setIsValidating] = useState(true);
  const [validationError, setValidationError] = useState("");
  const [userConfirmation, setUserConfirmation] = useState<{
    isConfirmed: boolean;
    message: string;
  }>({ isConfirmed: false, message: "" });
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<NewPasswordFormInputs>({
    resolver: zodResolver(newPasswordSchema),
  });

  useEffect(() => {
    if (userConfirmation.message) {
      navigate("/login", { state: userConfirmation });
    }
  }, [userConfirmation]);

  useEffect(() => {
    async function checkGlobalId() {
      try {
        const globalIdData = await usersApi.getGlobalIdInfo<any>(String(GLOBAL_ID));

        if (!globalIdData) {
          throw new Error("Dados do Global ID inválidos");
        } else if (globalIdData.operation !== "recuperarPassword") {
          setUserConfirmation({
            isConfirmed: false,
            message: "Operação inválida! O botão que foi enviado no email já não funciona.",
          });
        }
      } catch (error) {
        setValidationError(
          error instanceof Error ? error.message : "Não foi possível validar o link de recuperação."
        );
      } finally {
        setIsValidating(false);
      }
    }
    checkGlobalId();
  }, [GLOBAL_ID]);

  const onSubmit = async (data: NewPasswordFormInputs) => {
    try {
      const recaptchaToken = await generateToken("update");

      await usersApi.changePasswordByEmail<any>({
        password: data.password,
        confirmPassword: data.confirmPassword,
        global_id: GLOBAL_ID,
        recaptchaToken,
      });

      setUserConfirmation({
        isConfirmed: true,
        message: "Palavra-passe atualizada com sucesso!",
      });
    } catch (error) {
      setUserConfirmation({
        isConfirmed: false,
        message: "Erro ao atualizar a palavra-passe",
      });
    }
  };

  return (
    <Container maxWidth="sm" sx={{ py: 6 }}>
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "40vh" }}>
      <Paper elevation={0} sx={{ p: 4, width: "100%", maxWidth: 480, minWidth: 0, boxSizing: "border-box" }}>
        <Typography
          variant="h5"
          sx={{
            mb: 2,
            textAlign: "center",
          }}
        >
          Definir Nova Palavra-Passe
        </Typography>
        {isValidating ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress aria-label="A validar link" />
          </Box>
        ) : validationError ? (
          <Alert severity="error">{validationError}</Alert>
        ) : (
        <form onSubmit={handleSubmit(onSubmit)}>
          <PasswordField
            {...register("password")}
            label="Nova Palavra-Passe"
            fullWidth
            margin="normal"
            error={!!errors.password}
            helperText={errors.password?.message}
          />
          <PasswordField
            {...register("confirmPassword")}
            label="Confirmar Palavra-Passe"
            fullWidth
            margin="normal"
            error={!!errors.confirmPassword}
            helperText={errors.confirmPassword?.message}
          />
          <Button
            type="submit"
            variant="contained"
            color="primary"
            fullWidth
            disabled={isSubmitting}
            sx={{
              mt: 2,
              position: "relative",
            }}
          >
            Atualizar Palavra-Passe
          </Button>
        </form>
        )}
      </Paper>
      </Box>
    </Container>
  );
}

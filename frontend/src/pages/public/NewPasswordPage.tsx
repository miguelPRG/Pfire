import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useParams, useNavigate } from "react-router-dom";
import { Box, Button, Typography, Paper } from "@mui/material";
import { useState, useEffect } from "react";
import PasswordField from "../../components/PasswordField";

const newPasswordSchema = z
  .object({
    password: z.string().min(6, "A nova palavra-passe deve ter pelo menos 6 caracteres"),
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
        const response = await fetch(`/backend/user/get-global-id/${GLOBAL_ID}`);
        if (!response.ok) {
          throw new Error("Global ID inválido ou expirado");
        }

        const globalIdData = await response.json();

        if (!globalIdData) {
          throw new Error("Dados do Global ID inválidos");
        } else if (globalIdData.operation !== "recuperarPassword") {
          setUserConfirmation({
            isConfirmed: false,
            message: "Operação inválida! O botão que foi enviado no email já não funciona.",
          });
        }
      } catch (error) {
        setUserConfirmation({
          isConfirmed: false,
          message: "Operação Expirada! O botão que foi enviado no email já não funciona.",
        });
      }
    }
    checkGlobalId();
  }, []);

  const onSubmit = async (data: NewPasswordFormInputs) => {
    try {
      const response = await fetch(`/backend/user/email/change-password/`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          password: data.password,
          confirmPassword: data.confirmPassword,
          global_id: GLOBAL_ID,
        }),
      });

      if (!response.ok) {
        const res = await response.json();
        setUserConfirmation({
          isConfirmed: false,
          message: res.message,
        });
        return;
      }

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
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "40vh",
      }}
    >
      <Paper elevation={0} sx={{ p: 4, minWidth: 350 }}>
        <Typography
          variant="h5"
          sx={{
            mb: 2,
            textAlign: "center",
          }}
        >
          Definir Nova Palavra-Passe
        </Typography>
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
      </Paper>
    </Box>
  );
}

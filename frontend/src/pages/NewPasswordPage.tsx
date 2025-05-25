import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useParams, useNavigate } from "react-router-dom";
import { Box, Button, TextField, Typography, Paper, CircularProgress } from "@mui/material";
import { useState, useLayoutEffect, useEffect } from "react";

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
  const [loading, setLoading] = useState(true); // loading começa como true
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

  useLayoutEffect(() => {
    if (!GLOBAL_ID) {
      setLoading(false);
      return;
    }

    const checkToken = async () => {
      try {
        const response = await fetch(`/backend/user/get-global-id/${GLOBAL_ID}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          setUserConfirmation({
            isConfirmed: false,
            message: "O botão que foi enviado no email já não funciona",
          });
        }
      } catch (error) {
        setUserConfirmation({
          isConfirmed: false,
          message: "O botão que foi enviado no email já não funciona",
        });
      }

      setLoading(false);
    };

    checkToken();
  }, []);

  useEffect(() => {
    if (!loading && userConfirmation.message) {
      navigate("/login", { state: userConfirmation });
    }
  }, [userConfirmation]);

  const onSubmit = async (data: NewPasswordFormInputs) => {
    try {
      const response = await fetch(`/backend/user/email/reset-password`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          password: data.password.trim(),
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

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <Paper
          elevation={3}
          sx={{
            p: 4,
            minWidth: 350,
            textAlign: "center",
          }}
        >
          <CircularProgress
            sx={{
              mb: 2,
            }}
          />
          <Typography>Carregando...</Typography>
        </Paper>
      </Box>
    );
  }

  return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="40vh">
      <Paper elevation={0} sx={{ p: 4, minWidth: 350 }}>
        <Typography variant="h5" mb={2} textAlign="center">
          Definir Nova Palavra-Passe
        </Typography>
        <form onSubmit={handleSubmit(onSubmit)}>
          <TextField
            {...register("password")}
            label="Nova Palavra-Passe"
            type="password"
            fullWidth
            margin="normal"
            error={!!errors.password}
            helperText={errors.password?.message}
          />
          <TextField
            {...register("confirmPassword")}
            label="Confirmar Palavra-Passe"
            type="password"
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

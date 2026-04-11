import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Box, Button, Container, TextField, Typography, Paper, Fade, Alert } from "@mui/material";
import { useNavigate } from "react-router-dom";
import logo from "../../assets/images/logo.png";
import { useRecaptcha } from "../../hooks/RecaptchaContext";

// Esquema de validação com Zod
const forgotPasswordSchema = z.object({
  email: z.email("Insira um email válido").nonempty("O email é obrigatório").trim(),
});

type ForgotPasswordFormInputs = z.infer<typeof forgotPasswordSchema>;

function ForgotPassword() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [alertMsg, setAlertMsg] = useState("");
  const [alertType, setAlertType] = useState<"success" | "error">("success");
  const { generateToken } = useRecaptcha();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormInputs>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  async function onSubmit(data: ForgotPasswordFormInputs) {
    try {
      const recaptchaToken = await generateToken("forgot-password");

      const response = await fetch("/backend/user/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: data.email,
          recaptchaToken,
        }),
      });

      if (response.ok) {
        setAlertType("success");
        setAlertMsg("Foi enviado um email para poder confirmar o pedido de alteração da password.");
      } else {
        const res = await response.json();
        setAlertType("error");
        setAlertMsg(res.detail || "Ocorreu um erro ao enviar o pedido.");
      }
    } catch (err) {
      setAlertType("error");
      setAlertMsg("Ocorreu um erro ao enviar o pedido.");
    }
    setOpen(true);
  }

  return (
    <Container>
      {/* ALERTA COM FADE */}
      <Fade in={open} timeout={{ enter: 800, exit: 800 }} unmountOnExit>
        <Alert variant="filled" severity={alertType} sx={{}} onClose={() => setOpen(false)}>
          {alertMsg}
        </Alert>
      </Fade>
      <Container maxWidth="sm" sx={{ mt: 10 }}>
        <Paper
          elevation={3}
          sx={{
            p: 4,
            borderRadius: 3,
            position: "relative",
            overflow: "visible",
          }}
        >
          <Box
            sx={{
              position: "absolute",
              top: -40,
              left: "50%",
              transform: "translateX(-50%)",
              backgroundColor: "primary.main",
              borderRadius: "50%",
              width: 80,
              height: 80,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: 3,
            }}
          >
            <img
              src={logo}
              alt="Logo"
              style={{
                width: 120,
                height: 120,
                objectFit: "contain",
              }}
            />
          </Box>

          <Typography
            variant="h1"
            sx={{
              textAlign: "center",
              mb: 3,
              mt: 4,
            }}
          >
            Não te lembras da tua Palavra-Passe?
          </Typography>
          <Typography
            sx={{
              textAlign: "center",
              mb: 4,
              mt: 4,
            }}
          >
            Introduz em baixo o email associado à tua conta Pfire.
          </Typography>

          <Box
            component="form"
            onSubmit={handleSubmit(onSubmit)}
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 2,
            }}
          >
            <TextField
              {...register("email")}
              label="Email"
              type="email"
              fullWidth
              error={!!errors.email}
              helperText={errors.email?.message}
            />

            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                gap: 2,
                mt: 4,
              }}
            >
              <Button
                type="button"
                onClick={() => navigate("/login")}
                sx={{
                  flex: 2,
                  minWidth: "200px",
                  color: "white",
                  fontWeight: "bold",
                }}
              >
                Cancelar
              </Button>

              <Button
                type="submit"
                sx={{
                  flex: 2,
                  background: "linear-gradient(45deg, #FFA726 30%, #FB8C00 90%)",
                  color: "white",
                  fontWeight: "bold",
                  whiteSpace: "nowrap",
                  transition: "0.3s",
                  "&:hover": {
                    background: "linear-gradient(45deg, #FB8C00 30%, #FFA726 90%)",
                  },
                }}
                disabled={isSubmitting}
              >
                {isSubmitting ? "A enviar..." : "Recuperar Palavra-Passe"}
              </Button>
            </Box>
          </Box>
        </Paper>
      </Container>
    </Container>
  );
}

export default ForgotPassword;

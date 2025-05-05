import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Box,
  Button,
  Container,
  TextField,
  Typography,
  Paper,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import logo from "../assets/images/logo.png";

// Esquema de validação com Zod
const forgotPasswordSchema = z.object({
  email: z
    .string()
    .nonempty("O email é obrigatório")
    .email("Insira um email válido"),
});

type ForgotPasswordFormInputs = z.infer<typeof forgotPasswordSchema>;

function ForgotPassword() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormInputs>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = (data: ForgotPasswordFormInputs) => {
    console.log("E-mail enviado para:", data.email);
    setOpen(true); // Abre o modal
  };

  const handleClose = () => {
    setOpen(false);
    navigate("/login");
  };

  return (
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

        <Typography variant="h1" textAlign="center" mb={3} mt={4}>
          Não te lembras da tua Palavra-Passe?
        </Typography>
        <Typography textAlign="center" mb={4} mt={4}>
          Introduz em baixo o email associado à tua conta Pfire.
        </Typography>

        <Box
          component="form"
          onSubmit={handleSubmit(onSubmit)}
          display="flex"
          flexDirection="column"
          gap={2}
        >
          <TextField
            {...register("email")}
            label="Email"
            type="email"
            fullWidth
            error={!!errors.email}
            helperText={errors.email?.message}
            required
          />

          <Box display="flex" justifyContent="space-between" gap={2} mt={4}>
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

      {/* MODAL DE CONFIRMAÇÃO */}
      <Dialog open={open} onClose={handleClose}>
        <DialogContent>
          <DialogContentText>
            Se existir uma conta com esse e-mail, receberás um link de recuperação em breve.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} autoFocus>
            OK
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default ForgotPassword;

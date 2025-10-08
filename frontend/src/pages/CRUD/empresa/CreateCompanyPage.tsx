import { useState } from "react";
import { Box, Button, Paper, TextField, Typography, Snackbar, Alert, CircularProgress, useTheme } from "@mui/material";
import BusinessIcon from "@mui/icons-material/Business";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import isValidNIF from "../../utils/isValidNIF";
import GlobalPhone from "../../../components/GlobalPhone";
import { useRecaptcha } from "../../../hooks/RecaptchaContext";

// 📌 Esquema de validação
const empresaSchema = z.object({
  nome: z.string().nonempty("O nome da empresa é obrigatório").trim(),
  nif: z.string().nonempty("O NIF é obrigatório").trim().refine(isValidNIF, { message: "O NIF é inválido" }),
  localidade: z.string().nonempty("A localidade é obrigatória").trim(),
  morada: z.string().nonempty("A morada é obrigatória").trim(),
  codigo_postal: z
    .string()
    .nonempty("O código postal é obrigatório")
    .trim()
    .regex(/^\d{4}-\d{3}$/, "O código postal deve estar no formato 1234-567"),
  telefone: z
    .string()
    .nonempty("Campo obrigatório")
    .trim()
    .regex(/^\+?[0-9\s\-()]{9,15}$/, "Número de telefone inválido"),
});

type EmpresaFormInputs = z.infer<typeof empresaSchema>;

export default function CreateCompanyPage() {
  const theme = useTheme();
  const [alert, setAlert] = useState<{ message: string; isError: boolean } | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { generateToken } = useRecaptcha();

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<EmpresaFormInputs>({
    resolver: zodResolver(empresaSchema),
    mode: "onTouched",
  });

  // 📌 Enviar al backend
  const onSubmit = async (data: EmpresaFormInputs) => {
    setLoading(true);
    try {
      const recaptchaToken = await generateToken("register");

      const payload = { ...data, recaptchaToken };

      const res = await fetch("/backend/empresa/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        let err;
        try {
          err = await res.json();
        } catch {
          throw new Error("Erro desconhecido do backend");
        }
        throw new Error(err.detail || "Erro ao criar empresa");
      }

      setAlert({ message: "Empresa criada com sucesso!", isError: false });
      setTimeout(() => {
        navigate("/choose-company");
        reset();
      }, 1200);
    } catch (error: any) {
      setAlert({ message: error.message || "Erro ao criar empresa", isError: true });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate("/choose-company");
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: theme.palette.mode === "dark" ? theme.palette.background.default : "#f4f6fa",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: 2,
      }}
    >
      <Paper
        elevation={6}
        sx={{
          width: 800,
          maxWidth: "98vw",
          p: { xs: 3, sm: 7 },
          borderRadius: 5,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          bgcolor: theme.palette.mode === "dark" ? theme.palette.background.paper : "#fff",
          boxShadow:
            theme.palette.mode === "dark" ? "0 0 15px rgba(255,255,255,0.08)" : "0 8px 32px 0 rgba(0,55,139,0.11)",
        }}
      >
        {/* Encabezado */}
        <Box sx={{ mb: 2, display: "flex", flexDirection: "column", alignItems: "center" }}>
          <BusinessIcon color="primary" sx={{ fontSize: 56, mb: 1 }} />
          <Typography variant="h5" fontWeight="bold" sx={{ mb: 1 }}>
            Criar Nova Empresa
          </Typography>
          <Typography color="text.secondary" fontSize={15} mb={2} align="center">
            Preencha os campos abaixo para cadastrar uma nova empresa.
          </Typography>
        </Box>

        {/* Formulario */}
        <Box
          component="form"
          onSubmit={handleSubmit(onSubmit)}
          sx={{
            width: "100%",
            display: "flex",
            flexDirection: "column",
            gap: 3,
          }}
          autoComplete="off"
        >
          <TextField
            label="Nome"
            {...register("nome")}
            error={!!errors.nome}
            helperText={errors.nome?.message}
            fullWidth
          />
          <TextField label="NIF" {...register("nif")} error={!!errors.nif} helperText={errors.nif?.message} fullWidth />

          <GlobalPhone fieldName="telefone" control={control} errors={errors} />

          <TextField
            label="Morada"
            {...register("morada")}
            error={!!errors.morada}
            helperText={errors.morada?.message}
            fullWidth
          />
          <TextField
            label="Localidade"
            {...register("localidade")}
            error={!!errors.localidade}
            helperText={errors.localidade?.message}
            fullWidth
          />
          <TextField
            label="Código Postal"
            {...register("codigo_postal")}
            error={!!errors.codigo_postal}
            helperText={errors.codigo_postal?.message}
            fullWidth
          />

          <Box
            sx={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 2,
              mt: 2,
              width: "100%",
            }}
          >
            <Button
              variant="outlined"
              onClick={handleCancel}
              sx={{
                flex: 1,
                "&:hover": {
                  bgcolor: "grey.300",
                },
                minWidth: 0,
              }}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="contained"
              sx={{
                flex: 1,
                backgroundColor: theme.palette.success.main,
                color: "white",
                "&:hover": {
                  backgroundColor: theme.palette.success.dark,
                },
                minWidth: 0,
              }}
              disabled={isSubmitting || loading}
              startIcon={loading ? <CircularProgress size={20} /> : null}
            >
              {isSubmitting || loading ? "A criar..." : "Salvar"}
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* Snackbar */}
      <Snackbar
        open={!!alert}
        autoHideDuration={3200}
        onClose={() => setAlert(null)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert severity={alert?.isError ? "error" : "success"} sx={{ width: "100%" }}>
          {alert?.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

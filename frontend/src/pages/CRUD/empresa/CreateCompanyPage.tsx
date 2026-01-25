// src/pages/CRUD/empresa/CreateCompanyPage.tsx
import { useState } from "react";
import { Box, TextField, Snackbar, Alert, Paper, useMediaQuery, useTheme, Typography, Container } from "@mui/material";
import BusinessIcon from "@mui/icons-material/Business";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import isValidNIF from "../../utils/isValidNIF";
import GlobalPhone from "../../../components/GlobalPhone";
import SaveCancelBar from "../../../components/SaveCancelBar";

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
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [alert, setAlert] = useState<{ message: string; isError: boolean } | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

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

  const onSubmit = async (data: EmpresaFormInputs) => {
    setLoading(true);
    try {
      const res = await fetch("/backend/empresa/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
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

  const handleCancel = () => navigate("/choose-company");

  return (
    <Container maxWidth="sm" sx={{ textAlign: "center", mt: 4, p: 4, borderRadius: 2 }}>
      <Paper elevation={6} sx={{ p: isMobile ? 2 : 4 }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", mb: 2 }}>
          <BusinessIcon color="primary" sx={{ fontSize: 56, mr: 1 }} />
        </Box>
        <Typography variant="h5" sx={{ mb: 1 }}>
          Criar nova empresa
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Preencha os campos abaixo para cadastrar uma nova empresa.
        </Typography>

        <Box
          component="form"
          onSubmit={handleSubmit(onSubmit)}
          sx={{ width: "100%", display: "flex", flexDirection: "column", gap: 3 }}
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

          <SaveCancelBar onCancel={handleCancel} loading={isSubmitting || loading} />
        </Box>
      </Paper>

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
    </Container>
  );
}

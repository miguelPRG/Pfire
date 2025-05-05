import { Box, Button, TextField, Typography, Paper } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@mui/material/styles";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

declare var grecaptcha: any;

// Esquema de validação com Zod
const addClientSchema = z.object({
  nome: z.string().nonempty("O nome é obrigatório"),
  email: z.string().nonempty("O email é obrigatório").email("Email inválido"),
  telefone: z
    .string()
    .nonempty("O telefone é obrigatório")
    .regex(/^\d{9}$/, "O telefone deve ter 9 dígitos"),
  nif: z
    .string()
    .nonempty("O NIF é obrigatório")
    .regex(/^[5789]\d{8}$/, "O NIF é inválido"),
  localidade: z.string().nonempty("A localidade é obrigatória"),
  morada: z.string().nonempty("A morada é obrigatória"),
  codigo_postal: z
    .string()
    .nonempty("O código postal é obrigatório")
    .regex(/^\d{4}-\d{3}$/, "O código postal deve estar no formato 1234-567"),
  recaptchaToken: z.string().optional(), // Adiciona o token do reCAPTCHA como opcional
});

type AddClientFormInputs = z.infer<typeof addClientSchema>;

export default function AddNewClientPage() {
  const navigate = useNavigate();
  const theme = useTheme();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AddClientFormInputs>({
    resolver: zodResolver(addClientSchema),
  });

  const enviarNovoCliente = async (dados: AddClientFormInputs & { empresa_id: string }) => {
    try {
      if (!dados.empresa_id || !/^[a-f\d]{24}$/i.test(dados.empresa_id)) {
        throw new Error("ID da empresa inválido ou não fornecido.");
      }

      const recaptchaToken = await grecaptcha.enterprise.execute(
        "6LdDN-kqAAAAAHYkxo-9PioMLoErWSv1vUvwdig4",
        { action: "register" }
      );

      dados.recaptchaToken = recaptchaToken; // Adiciona o token ao payload

      const response = await fetch(`/backend/cliente`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(dados),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Erro ao criar cliente");
      }

      console.log("Cliente criado com sucesso:", data);
    } catch (error) {
      console.error("Erro ao criar cliente:", error);
      throw error;
    }
  };

  const onSubmit = async (formData: AddClientFormInputs) => {
    const empresa_id = prompt("Insere o ID da empresa:");
    if (!empresa_id) {
      alert("Erro: empresa_id não fornecido.");
      return;
    }

    try {
      await enviarNovoCliente({ ...formData, empresa_id });
      alert("Novo cliente adicionado com sucesso!");
      navigate("/ClientManagementTable");
    } catch (error) {
      alert("Erro ao adicionar cliente.");
    }
  };

  const handleCancel = () => {
    navigate("/ClientManagementTable");
  };

  return (
    <Paper sx={{ maxWidth: 600, mx: "auto", mt: 5, p: 4 }}>
      <Typography
        variant="h5"
        sx={{ fontWeight: "bold", fontSize: 30, textAlign: "center" }}
      >
        Adicionar novo Cliente
      </Typography>

      <Box
        component="form"
        onSubmit={handleSubmit(onSubmit)}
        sx={{ display: "flex", flexDirection: "column", gap: 2 }}
      >
        <TextField
          {...register("nome")}
          label="Nome"
          error={!!errors.nome}
          helperText={errors.nome?.message}
          required
          fullWidth
        />
        <TextField
          {...register("email")}
          label="Email"
          type="email"
          error={!!errors.email}
          helperText={errors.email?.message}
          required
          fullWidth
        />
        <TextField
          {...register("telefone")}
          label="Telefone"
          error={!!errors.telefone}
          helperText={errors.telefone?.message}
          required
          fullWidth
        />
        <TextField
          {...register("nif")}
          label="NIF"
          error={!!errors.nif}
          helperText={errors.nif?.message}
          required
          fullWidth
        />
        <TextField
          {...register("localidade")}
          label="Localidade"
          error={!!errors.localidade}
          helperText={errors.localidade?.message}
          fullWidth
        />
        <TextField
          {...register("morada")}
          label="Morada"
          error={!!errors.morada}
          helperText={errors.morada?.message}
          fullWidth
        />
        <TextField
          {...register("codigo_postal")}
          label="Código Postal"
          error={!!errors.codigo_postal}
          helperText={errors.codigo_postal?.message}
          fullWidth
        />

        <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2, mt: 2 }}>
          <Button
            onClick={handleCancel}
            sx={{
              backgroundColor: theme.palette.primary.main,
              color: "white",
              minWidth: 140,
            }}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="contained"
            sx={{
              backgroundColor: theme.palette.success.main,
              color: "white",
              "&:hover": { backgroundColor: theme.palette.success.dark },
              minWidth: 140,
            }}
            disabled={isSubmitting}
          >
            {isSubmitting ? "A adicionar..." : "Adicionar"}
          </Button>
        </Box>
      </Box>
    </Paper>
  );
}

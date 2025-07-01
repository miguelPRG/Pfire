import { Box, Button, TextField, Typography, Paper, Alert } from "@mui/material";
import { useNavigate, useLocation } from "react-router-dom";
import { useTheme } from "@mui/material/styles";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "../hooks/AuthContext";
import { useState } from "react";
import GlobalPhone from "../components/GlobalPhone";
import validarNIF from "./utils/isValidNIF";

declare var grecaptcha: any;
// Esquema de validação com Zod
const addClientSchema = z.object({
  nome: z.string().nonempty("O nome é obrigatório"),
  email: z.string().nonempty("O email é obrigatório").email("Email inválido"),
  telefone: z
    .string()
    .nonempty("O telefone é obrigatório")
    .refine((val) => val?.startsWith("+") && val.length >= 10, {
      message: "Número de telefone internacional inválido",
    }),
  nif: z
    .string()
    .nonempty("O NIF é obrigatório")
    .regex(/^[5789]\d{8}$/, "O NIF é inválido")
    .refine(validarNIF, "O NIF é inválido"),
  localidade: z.string().nonempty("A localidade é obrigatória"),
  morada: z.string().nonempty("A morada é obrigatória"),
  codigo_postal: z
    .string()
    .nonempty("O código postal é obrigatório")
    .regex(/^\d{4}-\d{3}$/, "Número de telefone inválido"),
});

type AddClientFormInputs = Omit<z.infer<typeof addClientSchema>, "recaptchaToken">;

export default function AddNewClientPage() {
  const location = useLocation();
  const cliente = location.state?.cliente;
  const { empresa } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<AddClientFormInputs>({
    resolver: zodResolver(addClientSchema),
    defaultValues: cliente
      ? {
          nome: cliente.nome || "",
          email: cliente.email || "",
          telefone: cliente.telefone || "",
          nif: cliente.nif || "",
          localidade: cliente.localidade || "",
          morada: cliente.morada || "",
          codigo_postal: cliente.codigoPostal || "",
        }
      : {},
  });

  const enviarNovoCliente = async (dados: AddClientFormInputs, recaptchaToken: string) => {
    try {
      if (!empresa?.id || !/^[a-f\d]{24}$/i.test(empresa.id)) {
        throw new Error("ID da empresa inválido ou não fornecido.");
      }

      // O backend espera recaptchaToken e empresa_id no corpo
      const response = await fetch(`/backend/cliente`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          ...dados,
          empresa_id: empresa.id,
          recaptchaToken,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.detail || "Erro ao criar cliente");
      }
    } catch (error) {
      throw error;
    }
  };

  const atualizarCliente = async (dados: AddClientFormInputs & { id: string }, recaptchaToken: string) => {
    try {
      if (!empresa?.id || !/^[a-f\d]{24}$/i.test(empresa.id)) {
        throw new Error("ID da empresa inválido ou não fornecido.");
      }
      if (!dados.id || !/^[a-f\d]{24}$/i.test(dados.id)) {
        throw new Error("ID do cliente inválido ou não fornecido.");
      }

      var body = JSON.stringify({
        ...dados,
        empresa_id: empresa.id,
        recaptchaToken,
      });
      console.log("Dados enviados para o backend:", body);

      // O backend espera recaptchaToken e empresa_id no corpo
      const response = await fetch(`/backend/cliente/${dados.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },

        credentials: "include",
        body: JSON.stringify({
          ...dados,
          empresa_id: empresa.id,
          recaptchaToken,
        }),
      });

      const data = await response.json();

      console.log("Resposta do backend:", data);

      if (!response.ok) {
        alert(data.detail || "Erro ao atualizar cliente");
      }
    } catch (error) {
      throw error;
    }
  };

  const onSubmit = async (formData: AddClientFormInputs) => {
    setErrorMessage(null);
    try {
      const recaptchaToken = await grecaptcha.enterprise.execute("6LdDN-kqAAAAAHYkxo-9PioMLoErWSv1vUvwdig4", {
        action: "register",
      });

      if (!empresa?.id) {
        setErrorMessage("Empresa não encontrada.");
        return;
      }

      if (cliente) {
        await atualizarCliente({ ...formData, id: cliente.id }, recaptchaToken);
        navigate("/clients-list", {
          state: { message: { error: false, text: "Cliente atualizado com sucesso!" } },
        });
      } else {
        await enviarNovoCliente(formData, recaptchaToken);
        navigate("/clients-list", {
          state: { message: { error: false, text: "Novo cliente adicionado com sucesso!" } },
        });
      }
    } catch (error: any) {
      setErrorMessage(
        cliente ? error?.message || "Erro ao atualizar cliente." : error?.message || "Erro ao adicionar cliente."
      );
    }
  };

  const handleCancel = () => {
    navigate("/clients-list");
  };

  return (
    <Paper sx={{ maxWidth: 600, mx: "auto", mt: 5, p: 4 }}>
      {errorMessage && (
        <Box mb={2}>
          <Alert severity="error" variant="filled" onClose={() => setErrorMessage(null)}>
            {errorMessage}
          </Alert>
        </Box>
      )}
      <Typography
        variant="h5"
        sx={{
          fontWeight: "bold",
          fontSize: 30,
          textAlign: "center",
        }}
      >
        {cliente ? "Editar Cliente" : "Adicionar novo Cliente"}
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
          {...register("nome")}
          label="Nome"
          error={!!errors.nome}
          helperText={errors.nome?.message}
          fullWidth
        />
        <TextField
          {...register("email")}
          label="Email"
          type="email"
          error={!!errors.email}
          helperText={errors.email?.message}
          fullWidth
        />
        <GlobalPhone fieldName="telefone" control={control} errors={errors} />
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
         
             
            }}}
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
            disabled={isSubmitting}
          >
            {isSubmitting
              ? (cliente ? "Atualizando..." : "A adicionar...")
              : (cliente ? "Atualizar dados do cliente" : "Salvar")}
          </Button>
        </Box>
      </Box>
    </Paper>
  );
}

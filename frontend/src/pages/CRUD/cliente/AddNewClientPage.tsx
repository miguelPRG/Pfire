// src/pages/CRUD/cliente/AddNewClientPage.tsx
import {
  Box,
  TextField,
  Alert,
  Breadcrumbs,
  Paper,
  useMediaQuery,
  useTheme,
  Typography,
  Container,
} from "@mui/material";
import HomeIcon from "@mui/icons-material/Home";
import PeopleAltOutlinedIcon from "@mui/icons-material/PeopleAltOutlined";
import { useNavigate, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "../../../hooks/AuthContext";
import { useState } from "react";
import GlobalPhone from "../../../components/GlobalPhone";
import validarNIF from "../../utils/isValidNIF";
import StyledBreadcrumb from "../../../components/StyledBreadCrumbs";
import SaveCancelBar from "../../../components/SaveCancelBar";

const addClientSchema = z.object({
  nome: z.string().nonempty("O nome é obrigatório").trim(),
  email: z.email("Email inválido").nonempty("O email é obrigatório").trim(),
  telefone: z
    .string()
    .nonempty("O telefone é obrigatório")
    .trim()
    .refine((val) => val?.startsWith("+") && val.length >= 10, {
      message: "Número de telefone internacional inválido",
    }),
  nif: z.string().nonempty("O NIF é obrigatório").trim().refine(validarNIF, "O NIF é inválido"),
  localidade: z.string().nonempty("A localidade é obrigatória").trim(),
  morada: z.string().nonempty("A morada é obrigatória").trim(),
  codigo_postal: z
    .string()
    .nonempty("O código postal é obrigatório")
    .trim()
    .regex(/^\d{4}-\d{3}$/, "Código postal no formato 1234-567"),
});

type AddClientFormInputs = z.infer<typeof addClientSchema>;

export default function AddNewClientPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const location = useLocation();
  const cliente = (location as any).state?.cliente;
  const { empresa } = useAuth();
  const navigate = useNavigate();
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

  const enviarNovoCliente = async (dados: AddClientFormInputs) => {
    const response = await fetch(`/backend/cliente/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ ...dados, empresa_id: empresa?.id }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || "Erro ao criar cliente");
    navigate("/clients-list", { state: { message: { error: false, text: "Novo cliente adicionado com sucesso!" } } });
  };

  const atualizarCliente = async (dados: AddClientFormInputs & { id: string }) => {
    if (!empresa?.id || !/^[a-f\\d]{24}$/i.test(empresa.id))
      throw new Error("ID da empresa inválido ou não fornecido.");
    if (!dados.id || !/^[a-f\\d]{24}$/i.test(dados.id)) throw new Error("ID do cliente inválido ou não fornecido.");

    const response = await fetch(`/backend/cliente/update/${dados.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ ...dados, empresa_id: empresa.id }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || "Erro ao atualizar cliente");
    navigate("/clients-list", { state: { message: { error: false, text: "Cliente atualizado com sucesso!" } } });
  };

  const onSubmit = async (formData: AddClientFormInputs) => {
    setErrorMessage(null);
    try {
      if (!empresa?.id) {
        setErrorMessage("Empresa não encontrada.");
        return;
      }
      if (cliente) await atualizarCliente({ ...formData, id: cliente.id });
      else await enviarNovoCliente(formData);
    } catch (error: any) {
      setErrorMessage(
        cliente ? error?.message || "Erro ao atualizar cliente." : error?.message || "Erro ao adicionar cliente."
      );
    }
  };

  const handleCancel = () => navigate(-1);

  const breadcrumbs = (
    <Breadcrumbs
      aria-label="breadcrumb"
      sx={{ mr: "auto", backgroundColor: "background.paper", borderRadius: 5, p: 0.5, boxShadow: 1, maxWidth: 320 }}
    >
      <StyledBreadcrumb
        component="a"
        sx={{ cursor: "pointer" }}
        onClick={() => navigate("/")}
        icon={<HomeIcon fontSize="small" sx={{ fontSize: "1.8rem" }} />}
      />
      <StyledBreadcrumb
        component="a"
        sx={{ cursor: "pointer", fontSize: "0.9rem" }}
        label="Clientes"
        onClick={() => navigate("/clients-list")}
      />
      <StyledBreadcrumb
        component="span"
        sx={{ fontSize: "0.9rem" }}
        label={cliente ? "Editar Cliente" : "Novo Cliente"}
      />
    </Breadcrumbs>
  );

  return (
    <Container maxWidth="md" sx={{ textAlign: "center", mt: 4, p: 4, borderRadius: 2 }}>
      <Box sx={{ mb: 2 }}>{breadcrumbs}</Box>
      <Paper elevation={6} sx={{ p: isMobile ? 2 : 4 }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", mb: 2 }}>
          <PeopleAltOutlinedIcon color="primary" sx={{ fontSize: 48, mr: 1 }} />
        </Box>
        <Typography variant="h5" sx={{ mb: 1 }}>
          {cliente ? "Editar Cliente" : "Adicionar novo Cliente"}
        </Typography>
        <Typography
          variant="body2"
          sx={{
            color: "text.secondary",
            mb: 3,
          }}
        >
          Preencha os campos para gerir os dados do cliente.
        </Typography>

        {errorMessage && (
          <Box
            sx={{
              mb: 1,
            }}
          >
            <Alert severity="error" variant="filled" onClose={() => setErrorMessage(null)}>
              {errorMessage}
            </Alert>
          </Box>
        )}

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
          <TextField {...register("nif")} label="NIF" error={!!errors.nif} helperText={errors.nif?.message} fullWidth />
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

          <SaveCancelBar
            onCancel={handleCancel}
            loading={isSubmitting}
            saveText={cliente ? "Atualizar dados do cliente" : "Salvar"}
          />
        </Box>
      </Paper>
    </Container>
  );
}

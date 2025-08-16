import { Box, Button, TextField, Typography, Paper, Alert, Breadcrumbs } from "@mui/material";
import { useNavigate, useLocation } from "react-router-dom";
import { useTheme } from "@mui/material/styles";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "../../../hooks/AuthContext";
import { useState } from "react";
import GlobalPhone from "../../../components/GlobalPhone";
import validarNIF from "../../utils/isValidNIF";
import HomeIcon from "@mui/icons-material/Home"; // Adicione esta linha
import StyledBreadcrumb from "../../../components/StyledBreadCrumbs"; // Adicione esta linha

declare var grecaptcha: any;

// Esquema de validação com Zod
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
    .regex(/^\d{4}-\d{3}$/, "Número de telefone inválido"),
});

// Define o tipo dos inputs do formulário, omitindo recaptchaToken
type AddClientFormInputs = Omit<z.infer<typeof addClientSchema>, "recaptchaToken">;

// Componente principal da página
export default function AddNewClientPage() {
  const location = useLocation(); // Hook para acessar o estado de navegação
  const cliente = location.state?.cliente; // Recupera cliente do estado, se existir (edição)
  const { empresa } = useAuth(); // Recupera dados da empresa do contexto de autenticação
  const navigate = useNavigate(); // Hook para navegação programática
  const theme = useTheme(); // Acessa o tema do Material UI
  const [errorMessage, setErrorMessage] = useState<string | null>(null); // Estado para mensagens de erro

  // Inicializa o formulário com react-hook-form e zodResolver
  const {
    register, // Função para registrar campos
    handleSubmit, // Função para lidar com submit
    control, // Controle para campos customizados
    formState: { errors, isSubmitting }, // Estado do formulário (erros e status de envio)
  } = useForm<AddClientFormInputs>({
    resolver: zodResolver(addClientSchema), // Usa o esquema Zod para validação
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
      : {}, // Se estiver editando, preenche os campos com os dados do cliente
  });

  // Função para enviar novo cliente ao backend
  const enviarNovoCliente = async (dados: AddClientFormInputs, recaptchaToken: string) => {
    try {
      if (!empresa?.id || !/^[a-f\d]{24}$/i.test(empresa.id)) {
        throw new Error("ID da empresa inválido ou não fornecido."); // Valida o ID da empresa
      }

      // O backend espera recaptchaToken e empresa_id no corpo
      const response = await fetch(`/backend/cliente`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // Inclui cookies na requisição
        body: JSON.stringify({
          ...dados,
          empresa_id: empresa.id,
          recaptchaToken,
        }),
      });

      const data = await response.json(); // Lê resposta do backend

      if (!response.ok) {
        alert(data.detail || "Erro ao criar cliente"); // Mostra erro se houver
      }
    } catch (error) {
      throw error; // Propaga erro para tratamento externo
    }
  };

  // Função para atualizar cliente existente
  const atualizarCliente = async (dados: AddClientFormInputs & { id: string }, recaptchaToken: string) => {
    try {
      if (!empresa?.id || !/^[a-f\d]{24}$/i.test(empresa.id)) {
        throw new Error("ID da empresa inválido ou não fornecido."); // Valida ID da empresa
      }
      if (!dados.id || !/^[a-f\d]{24}$/i.test(dados.id)) {
        throw new Error("ID do cliente inválido ou não fornecido."); // Valida ID do cliente
      }

      var body = JSON.stringify({
        ...dados,
        empresa_id: empresa.id,
        recaptchaToken,
      });
      console.log("Dados enviados para o backend:", body); // Log para debug

      // O backend espera recaptchaToken e empresa_id no corpo
      const response = await fetch(`/backend/cliente/update/${dados.id}`, {
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

      const data = await response.json(); // Lê resposta do backend

      console.log("Resposta do backend:", data); // Log para debug

      if (!response.ok) {
        alert(data.detail || "Erro ao atualizar cliente"); // Mostra erro se houver
      }
    } catch (error) {
      throw error; // Propaga erro para tratamento externo
    }
  };

  // Função chamada ao submeter o formulário
  const onSubmit = async (formData: AddClientFormInputs) => {
    setErrorMessage(null); // Limpa mensagem de erro
    try {
      // Executa reCAPTCHA e obtém token
      const recaptchaToken = await grecaptcha.enterprise.execute("6LdDN-kqAAAAAHYkxo-9PioMLoErWSv1vUvwdig4", {
        action: "register",
      });

      if (!empresa?.id) {
        setErrorMessage("Empresa não encontrada."); // Verifica se empresa existe
        return;
      }

      if (cliente) {
        // Se for edição, atualiza cliente
        await atualizarCliente({ ...formData, id: cliente.id }, recaptchaToken);
        navigate("/clients-list", {
          state: { message: { error: false, text: "Cliente atualizado com sucesso!" } },
        });
      } else {
        // Se for novo, envia novo cliente
        await enviarNovoCliente(formData, recaptchaToken);
        navigate("/clients-list", {
          state: { message: { error: false, text: "Novo cliente adicionado com sucesso!" } },
        });
      }
    } catch (error: any) {
      setErrorMessage(
        cliente ? error?.message || "Erro ao atualizar cliente." : error?.message || "Erro ao adicionar cliente."
      ); // Mostra mensagem de erro apropriada
    }
  };

  // Função para cancelar e voltar à lista de clientes
  const handleCancel = () => {
    navigate(-1);
  };

  // Renderização do componente
  return (
    <Box sx={{ width: "100%", display: "flex", flexDirection: "column", padding: 2 }}>
      <Breadcrumbs
        aria-label="breadcrumb"
        sx={{
          mr: "auto", // EMPURRA para a direita
          backgroundColor: "background.paper",
          borderRadius: 5,
          p: 0.5,
          boxShadow: 1,
          // opcional: mantém largura máxima da “pílula”
          maxWidth: 320,
        }}
      >
        <StyledBreadcrumb
          component="a"
          sx={{ cursor: "pointer" }}
          onClick={() => navigate("/")}
          icon={<HomeIcon fontSize="small" sx={{ fontSize: "1.8rem" }} />}
        />
        <StyledBreadcrumb
          sx={{ cursor: "pointer", fontSize: "0.9rem" }}
          component="a"
          label="Clientes"
          onClick={() => navigate("/clients-list")}
        />
        <StyledBreadcrumb
          sx={{ fontSize: "0.9rem" }}
          component="span"
          label={cliente ? "Editar Cliente" : "Novo Cliente"}
        />
      </Breadcrumbs>
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
          {cliente ? "Editar Cliente" : "Adicionar novo Cliente"} {/* Título dinâmico */}
        </Typography>

        <Box
          component="form"
          onSubmit={handleSubmit(onSubmit)} // Lida com submit do formulário
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          <TextField
            {...register("nome")} // Campo nome
            label="Nome"
            error={!!errors.nome}
            helperText={errors.nome?.message}
            fullWidth
          />
          <TextField
            {...register("email")} // Campo email
            label="Email"
            type="email"
            error={!!errors.email}
            helperText={errors.email?.message}
            fullWidth
          />
          <GlobalPhone fieldName="telefone" control={control} errors={errors} />
          <TextField {...register("nif")} label="NIF" error={!!errors.nif} helperText={errors.nif?.message} fullWidth />
          <TextField
            {...register("localidade")} // Campo localidade
            label="Localidade"
            error={!!errors.localidade}
            helperText={errors.localidade?.message}
            fullWidth
          />
          <TextField
            {...register("morada")} // Campo morada
            label="Morada"
            error={!!errors.morada}
            helperText={errors.morada?.message}
            fullWidth
          />
          <TextField
            {...register("codigo_postal")} // Campo código postal
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
              onClick={handleCancel} // Botão cancelar
              sx={{
                flex: 1,

                "&:hover": {
                  bgcolor: "grey.300",
                },
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
              disabled={isSubmitting} // Desabilita enquanto está enviando
            >
              {isSubmitting
                ? cliente
                  ? "Atualizando..."
                  : "A adicionar..."
                : cliente
                  ? "Atualizar dados do cliente"
                  : "Salvar"}
            </Button>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}

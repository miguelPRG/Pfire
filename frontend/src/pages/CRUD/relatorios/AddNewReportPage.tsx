// Importa o React e o hook useState para gerenciar estados locais do componente
import { useState, Fragment, useEffect } from "react";
// Importa hooks do React Router para navegação e acesso à localização
import { useLocation, useNavigate } from "react-router-dom";
// Importa componentes de UI do Material-UI
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  Alert,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Autocomplete,
  Checkbox,
  Breadcrumbs,
} from "@mui/material";
import HomeIcon from "@mui/icons-material/Home";
// Importa o hook de autenticação personalizado
import { useAuth } from "../../../hooks/AuthContext";
// Importa o hook useQuery do Apollo Client para consultas GraphQL
import { useLazyQuery } from "@apollo/client/react";
// Importa a query GraphQL para buscar clientes por empresa
import { GET_CLIENTES_BY_EMPRESA } from "../../../graphql/clientesqueries";
// Importa a biblioteca zod para validação de dados
import { z } from "zod";

import { useTheme } from "@mui/material/styles"; // Tema do Material UI
import StyledBreadcrumb from "../../../components/StyledBreadCrumbs"; // Componente de breadcrumb estilizado

// Declaração global para o objeto grecaptcha (Google reCAPTCHA)
declare var grecaptcha: any;

interface returnData {
  getClientes: {
    clientes: any;
    totalClientes: number;
  };
}

// Define o componente funcional AddNewReportPage
function AddNewReportPage() {
  // Obtém a localização atual da navegação
  const location = useLocation();
  // Hook para navegação programática
  const navigate = useNavigate();
  // Obtém informações da empresa do contexto de autenticação
  const { empresa } = useAuth();
  // Obtém o modelo selecionado passado via navegação
  const selectedModel = location.state?.selectedModel;

  // Estado para armazenar os dados do formulário
  const [formData, setFormData] = useState<{ [key: string]: any }>({});
  // Estado para armazenar erros de validação dos campos
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  // Estado para o nome do relatório
  const [reportName, setReportName] = useState("");
  // Estado para o cliente selecionado
  const [selectedCliente, setSelectedCliente] = useState("");
  // Estado para mensagem de erro geral
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const theme = useTheme();

  // Executa a query GraphQL para buscar clientes da empresa
  const [getClientes, { data, loading }] = useLazyQuery<returnData>(GET_CLIENTES_BY_EMPRESA, {
    variables: { empresaId: empresa?.id },
    fetchPolicy: "cache-first",
  });

  useEffect(() => {
    if (empresa?.id) {
      getClientes();
    }
  }, [empresa?.id, getClientes]);

  // Função para exibir o nome do campo removendo o prefixo "custom_"
  const displayName = (key: string) => key.replace(/^custom_/, "");

  // Se não houver modelo selecionado, exibe mensagem de erro
  if (!selectedModel) {
    return (
      <Typography color="error">
        Nenhum modelo foi selecionado. Volte para a página anterior e selecione um modelo.
      </Typography>
    );
  }

  // Função para atualizar o estado dos campos do formulário
  const handleInputChange = (fieldId: string, value: any) => {
    setFormData((prev) => ({ ...prev, [fieldId]: value }));
  };

  // Função para construir o schema de validação dinâmico usando zod
  const buildSchema = () => {
    const dynamicFields: Record<string, any> = {};

    selectedModel.customFields.forEach((field: any) => {
      const value = field.value;
      const key = field.key;

      const makeSchemaByType = (type: string, required: boolean) => {
        switch (type) {
          case "number":
            return required
              ? z.preprocess(
                  (val) => Number(val),
                  z.number().refine((val) => !isNaN(val), { message: "Campo obrigatório" })
                )
              : z.preprocess((val) => Number(val), z.number().optional());
          case "date":
            return required
              ? z
                  .string()
                  .min(1, "Campo obrigatório")
                  .refine((val) => /^\d{2}\/\d{2}\/\d{4}$/.test(val), {
                    message: "Formato de data inválido (DD/MM/AAAA)",
                  })
              : z.string().optional();
          case "array":
            return required ? z.string().min(1, "Selecione pelo menos uma opção") : z.string().optional();
          case "string":
          default:
            return required ? z.string().min(1, "Campo obrigatório") : z.string().optional();
        }
      };

      if (value.datatype === "object") {
        Object.entries(value).forEach(([subKey, subValue]: [string, any]) => {
          if (!["datatype", "required", "label"].includes(subKey)) {
            const fullSubKey = subKey.startsWith("custom_") ? subKey : `custom_${subKey}`;
            dynamicFields[fullSubKey] = makeSchemaByType(subValue.datatype, subValue.required ?? false);
          }
        });
      } else if (value.datatype !== "bool") {
        // Ignora validação para campos booleanos
        const fullKey = key.startsWith("custom_") ? key : `custom_${key}`;
        dynamicFields[fullKey] = makeSchemaByType(value.datatype, value.required ?? false);
      }
    });

    return z.object({
      relatorio_nome: z.string().min(1, "O nome do relatório é obrigatório"),
      modelo_campos_id: z.string(),
      cliente_id: z.string().min(1, "Selecione um cliente"),
      empresa_id: z.string(),
      ...dynamicFields,
    });
  };

  // Função para tratar e validar os valores dos campos customizados
  const handleCustomField = (key: string, value: any, formData: any) => {
    const fullKey = key.startsWith("custom_") ? key : `custom_${key}`;

    if (formData[fullKey] !== undefined) {
      const rawValue = formData[fullKey];

      switch (value.datatype) {
        case "date":
          const dateValue = new Date(rawValue);
          if (isNaN(dateValue.getTime())) {
            throw new Error(`O campo ${fullKey} deve ser uma data válida.`);
          }
          return `${dateValue.getDate().toString().padStart(2, "0")}/${(dateValue.getMonth() + 1)
            .toString()
            .padStart(2, "0")}/${dateValue.getFullYear()}`; // DD/MM/YYYY

        case "number":
          const numberValue = parseFloat(rawValue);
          if (isNaN(numberValue)) {
            throw new Error(`O campo ${fullKey} deve ser um número válido.`);
          }
          return numberValue;

        case "bool":
          return !!rawValue; // Converte para booleano
        default:
          return String(rawValue);
      }
    }

    return ""; // Evita undefined
  };

  // Função utilitária para limpar o payload
  // Limpa nulls e arrays vazios recursivamente
  const cleanPayload = (obj: any): any => {
    if (Array.isArray(obj)) {
      const arr = obj
        .map((item) => cleanPayload(item))
        .filter((item) => item !== undefined && item !== null && !(Array.isArray(item) && item.length === 0));
      return arr.length > 0 ? arr : undefined;
    }

    if (obj !== null && typeof obj === "object") {
      const cleaned: Record<string, any> = {};
      Object.entries(obj).forEach(([key, value]) => {
        const cleanedValue = cleanPayload(value);
        if (
          cleanedValue !== undefined &&
          cleanedValue !== null &&
          !(Array.isArray(cleanedValue) && cleanedValue.length === 0)
        ) {
          cleaned[key] = cleanedValue;
        }
      });
      return Object.keys(cleaned).length > 0 ? cleaned : undefined;
    }

    if (obj === null || obj === undefined) {
      return undefined;
    }

    return obj;
  };

  // Função para tratar o envio do formulário
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault(); // Previne o comportamento padrão do formulário
    setErrors({}); // Limpa erros anteriores
    setErrorMessage(null); // Limpa mensagem de erro anterior

    try {
      // Executa o reCAPTCHA e obtém o token
      const recaptchaToken = await grecaptcha.enterprise.execute("6LdDN-kqAAAAAHYkxo-9PioMLoErWSv1vUvwdig4", {
        action: "register",
      });

      // Monta o payload inicial com campos fixos
      const payload: any = {
        relatorio_nome: reportName,
        modelo_campos_id: selectedModel.id,
        cliente_id: selectedCliente,
        empresa_id: empresa?.id,
        recaptchaToken,
      };

      selectedModel.customFields.forEach((field: any) => {
        const value = field.value;
        const baseKey = field.key;

        if (value.datatype === "object") {
          // Trata cada subcampo
          Object.entries(value).forEach(([subKey, subValue]: [string, any]) => {
            if (!["datatype", "required", "label"].includes(subKey)) {
              const fullSubKey = subKey.startsWith("custom_") ? subKey : `custom_${subKey}`;

              if (subValue.datatype === "bool") {
                // se marcado -> true, se não -> false
                payload[fullSubKey] = formData[fullSubKey] === true;
              } else {
                const processedValue = handleCustomField(fullSubKey, subValue, formData);
                payload[fullSubKey] = processedValue !== undefined ? processedValue : null;
              }
            }
          });
        } else {
          // Campo simples
          const fullKey = baseKey.startsWith("custom_") ? baseKey : `custom_${baseKey}`;

          if (value.datatype === "bool") {
            // se marcado -> true, se não -> false
            payload[fullKey] = formData[fullKey] === true;
          } else if (value.datatype === "array") {
            // Salva como string simples
            payload[fullKey] = formData[fullKey] ?? "";
          } else {
            let processedValue = handleCustomField(fullKey, value, formData);
            payload[fullKey] = processedValue !== undefined ? processedValue : null;
          }
        }
      });

      Object.entries(payload).forEach(([key, value]) => {
        if (key.startsWith("custom_")) {
          console.log(`${key}:`, value, " | Tipo:", Array.isArray(value) ? "array" : typeof value);
        }
      });

      /// Limpa payload de valores nulos e arrays vazios
      const cleanedPayload = cleanPayload(payload);

      // Valida com schema usando o payload já limpo
      const schema = buildSchema();
      schema.parse({
        relatorio_nome: cleanedPayload.relatorio_nome,
        modelo_campos_id: cleanedPayload.modelo_campos_id,
        cliente_id: cleanedPayload.cliente_id,
        empresa_id: cleanedPayload.empresa_id,
        recaptchaToken: cleanedPayload.recaptchaToken,
        ...cleanedPayload,
      });

      // Verifica se ao menos um campo personalizado foi incluído
      const hasCustomField = Object.keys(cleanedPayload).some((key) => key.startsWith("custom_"));
      if (!hasCustomField) {
        throw new Error("Modelo deve conter pelo menos um campo personalizado.");
      }

      const response = await fetch("/backend/relatorio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(cleanedPayload),
      });

      // Se houver erro na resposta, lança exceção
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Erro ao adicionar o relatório.");
      }

      // Navega para página de relatórios com sucesso
      navigate("/reports-list", {
        state: {
          message: {
            text: "Relatório adicionado com sucesso!",
            error: false,
          },
          reload: true,
        },
      });
    } catch (err: any) {
      // Se o erro for de validação zod, exibe os erros nos campos
      if (err instanceof z.ZodError) {
        const fieldErrors: { [key: string]: string } = {};
        err.issues.forEach((e) => {
          let msg = e.message;
          if (msg === "Invalid input: expected array, received undefined") {
            msg = "Selecione pelo menos uma opção";
          }
          if (e.path[0]) fieldErrors[e.path[0] as string] = msg;
        });
        setErrors(fieldErrors);
      } else {
        // Para outros erros, exibe mensagem geral
        setErrorMessage(err.message || "Erro ao adicionar o relatório.");
      }
    }
  };

  // Renderiza o componente
  return (
    <>
      {/* Breadcrumbs */}
      <Box sx={{ width: "100%", display: "flex", flexDirection: "column", gap: 2, padding: 2 }}>
        <Breadcrumbs
          aria-label="breadcrumb"
          sx={{
            mr: "auto", // EMPURRA para a direita
            backgroundColor: "background.paper",
            borderRadius: 5,
            p: 0.5,
            boxShadow: 1,
            // opcional: mantém largura máxima da “pílula”
            maxWidth: "450px",
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
            label="Relatórios"
            onClick={() => navigate("/reports-list")}
          />
          <StyledBreadcrumb
            sx={{ cursor: "pointer", fontSize: "0.9rem" }}
            component="a"
            label="Modelos"
            onClick={() => navigate("/report-models")}
          />
          <StyledBreadcrumb sx={{ fontSize: "0.9rem" }} component="span" label="Novo Relatório" />
        </Breadcrumbs>

        {/* Formulário principal */}
        <Paper sx={{ maxWidth: 600, mx: "auto", mt: 4, p: 4 }}>
          {/* Exibe alerta de erro geral, se houver */}
          {errorMessage && (
            <Box mb={2}>
              <Alert severity="error" variant="filled" onClose={() => setErrorMessage(null)}>
                {errorMessage}
              </Alert>
            </Box>
          )}

          {/* Título e nome do modelo */}
          <Box sx={{ mb: 3, display: "flex", alignItems: "center", flexDirection: "column" }}>
            <Typography variant="h4" gutterBottom>
              Adicionar Novo Relatório
            </Typography>
            <Typography variant="h6" gutterBottom>
              Modelo: {selectedModel.modelName}
            </Typography>
          </Box>

          {/* Formulário */}
          <form onSubmit={handleSubmit} noValidate>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {/* Campo para nome do relatório */}
              <Box sx={{ width: "100%", flexDirection: "column" }}>
                <TextField
                  value={reportName}
                  label="Nome do Relatório *"
                  onChange={(e) => setReportName(e.target.value)}
                  error={!!errors.relatorio_nome}
                  helperText={errors.relatorio_nome}
                />
              </Box>

              {/* Separador visual com estilo para os campos personalizados */}
              <Paper
                elevation={1}
                sx={{
                  p: 3,
                  mt: 2,
                  mb: 2,
                  borderRadius: 2,
                  backgroundColor: theme.palette.background.paper,
                  color: theme.palette.text.primary,
                  border: `1px solid ${theme.palette.divider}`,
                  boxShadow: theme.shadows[1],
                }}
              >
                <Typography gutterBottom sx={{ mb: 2 }}>
                  Campos Personalizados
                </Typography>

                {selectedModel.customFields.map((field: any) => {
                  const value = field.value;
                  const baseKey = field.key;
                  // Função para adicionar ' *' se o campo for obrigatório
                  const addRequiredMark = (label: string, required: boolean) =>
                    required && value.datatype != "bool" ? `${label} *` : label;

                  // Se for um campo composto (object)
                  if (value.datatype === "object") {
                    return (
                      <Fragment key={baseKey}>
                        <Box>
                          <Typography variant="subtitle1" sx={{ fontWeight: "bold", mt: 2 }}>
                            {displayName(baseKey)}
                          </Typography>
                        </Box>
                        {Object.entries(value).map(([subKey, subValue]: [string, any]) => {
                          if (["datatype", "required", "label"].includes(subKey)) return null;

                          const sanitizedSubKey = subKey.replace(/\s+/g, "_");
                          const fullSubKey = sanitizedSubKey.startsWith("custom_")
                            ? sanitizedSubKey
                            : `custom_${sanitizedSubKey}`;

                          const subLabel = addRequiredMark(displayName(subKey), subValue.required ?? false);

                          return (
                            <Box key={fullSubKey} sx={{ width: "100%", mt: 1 }}>
                              <TextField
                                fullWidth
                                label={subLabel}
                                type={
                                  subValue.datatype === "number"
                                    ? "number"
                                    : subValue.datatype === "date"
                                      ? "date"
                                      : "text"
                                }
                                slotProps={{
                                  inputLabel: {
                                    shrink: subValue.datatype === "date" ? true : undefined,
                                  },
                                }}
                                value={formData[fullSubKey] ?? ""}
                                onChange={(e) => handleInputChange(fullSubKey, e.target.value)}
                                error={!!errors[fullSubKey]}
                                helperText={errors[fullSubKey]}
                              />
                            </Box>
                          );
                        })}
                      </Fragment>
                    );
                  }

                  // Campo simples
                  const label = addRequiredMark(value.label || displayName(baseKey), value.required ?? false);
                  return (
                    <Box key={baseKey} sx={{ width: "100%", mt: 1 }}>
                      {value.datatype === "bool" ? (
                        (() => {
                          const fullKey = baseKey.startsWith("custom_") ? baseKey : `custom_${baseKey}`;
                          return (
                            <FormControl fullWidth error={!!errors[fullKey]}>
                              <Box sx={{ display: "flex", alignItems: "center" }}>
                                <Checkbox
                                  checked={!!formData[fullKey]}
                                  onChange={(e) => handleInputChange(fullKey, e.target.checked)}
                                />
                                <Typography>{label}</Typography>
                              </Box>
                              {errors[fullKey] && (
                                <Typography variant="caption" color="error">
                                  {errors[fullKey]}
                                </Typography>
                              )}
                            </FormControl>
                          );
                        })()
                      ) : value.datatype === "array" && Array.isArray(value.items) ? (
                        <FormControl fullWidth sx={{ mt: 2 }}>
                          <InputLabel
                            sx={{
                              "&.Mui-focused": {
                                transform: "translate(6px, -18px) scale(0.75)",
                              },
                            }}
                          >
                            {label}
                          </InputLabel>
                          <Select
                            value={formData[baseKey] ?? ""}
                            onChange={(e) => handleInputChange(baseKey, e.target.value)}
                            renderValue={(selected) => selected}
                            MenuProps={{
                              PaperProps: {
                                sx: {
                                  border: `1px solid ${theme.palette.divider}`,
                                  borderRadius: 2,
                                  boxShadow: 2,
                                  backgroundColor: theme.palette.background.paper,
                                  color: theme.palette.text.primary,
                                  width: "20%",
                                },
                              },
                            }}
                            sx={{
                              backgroundColor: theme.palette.background.paper,
                              color: theme.palette.text.primary,
                              "& .MuiSelect-icon": {
                                color: theme.palette.text.primary,
                              },
                              "& .MuiOutlinedInput-notchedOutline": {
                                borderColor: theme.palette.divider,
                              },
                              "&:hover .MuiOutlinedInput-notchedOutline": {
                                borderColor: theme.palette.primary.main,
                              },
                              "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                                borderColor: theme.palette.primary.main,
                              },
                            }}
                          >
                            {value.items.map((option: string) => (
                              <MenuItem
                                key={option}
                                value={option}
                                sx={{
                                  backgroundColor: theme.palette.background.paper,
                                  color: theme.palette.text.primary,
                                  "&.Mui-selected": {
                                    backgroundColor: theme.palette.action.selected,
                                  },
                                  "&:hover": {
                                    backgroundColor: theme.palette.action.hover,
                                  },
                                }}
                              >
                                {option}
                              </MenuItem>
                            ))}
                          </Select>

                          {errors[baseKey] && (
                            <Typography variant="caption" color="error">
                              {errors[baseKey]}
                            </Typography>
                          )}
                        </FormControl>
                      ) : (
                        <TextField
                          fullWidth
                          label={label} // Sempre usa o label, já com asterisco se obrigatório
                          type={value.datatype === "number" ? "number" : value.datatype === "date" ? "date" : "text"}
                          slotProps={{
                            inputLabel: {
                              shrink: value.datatype === "date" ? true : undefined,
                            },
                          }}
                          value={formData[baseKey] ?? ""}
                          onChange={(e) => handleInputChange(baseKey, e.target.value)}
                          error={!!errors[baseKey]}
                          helperText={errors[baseKey]}
                        />
                      )}
                    </Box>
                  );
                })}
              </Paper>

              {/* Campo de seleção de cliente */}
              <Box sx={{ width: "100%" }}>
                <Autocomplete
                  fullWidth
                  options={
                    formData.clienteInput && formData.clienteInput.length > 0 && data?.getClientes?.clientes
                      ? data.getClientes.clientes.filter((c: any) =>
                          c.nome.toLowerCase().includes(formData.clienteInput.toLowerCase())
                        )
                      : []
                  }
                  getOptionLabel={(option) => option.nome}
                  value={
                    selectedCliente
                      ? data?.getClientes?.clientes.find((c: any) => c.id === selectedCliente) || null
                      : null
                  }
                  onChange={(_, newValue) => {
                    setSelectedCliente(newValue?.id || "");
                  }}
                  isOptionEqualToValue={(option, value) => option.id === value.id}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Selecione um Cliente *"
                      error={!!errors.cliente_id}
                      helperText={errors.cliente_id}
                      fullWidth
                      onChange={(e) => {
                        const inputValue = e.target.value;
                        setFormData((prev) => ({
                          ...prev,
                          clienteInput: inputValue,
                        }));
                        // Chama a query para buscar clientes conforme o input
                        getClientes({ variables: { empresaId: empresa?.id, nome: inputValue } });
                      }}
                      value={formData.clienteInput || ""}
                      slotProps={{
                        input: {
                          ...params.InputProps,
                          endAdornment: null,
                        },
                      }}
                    />
                  )}
                  loading={loading}
                  openOnFocus
                  autoHighlight
                  inputValue={formData.clienteInput || ""}
                  onInputChange={(_, newInputValue) => {
                    setFormData((prev) => ({
                      ...prev,
                      clienteInput: newInputValue,
                    }));
                    // Chama a query para buscar clientes conforme o input
                    getClientes({ variables: { empresaId: empresa?.id, nome: newInputValue } });
                  }}
                />
              </Box>

              {/* Botões de ação */}
              <Box sx={{ display: "flex", justifyContent: "flex-start", gap: 2, mt: 4, width: "100%" }}>
                <Button variant="outlined" onClick={() => navigate("/report-models")}>
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  sx={{
                    backgroundColor: theme.palette.success.main,
                    color: "white",
                    "&:hover": {
                      backgroundColor: theme.palette.success.dark,
                    },
                  }}
                >
                  Salvar Relatório
                </Button>
              </Box>
            </Box>
          </form>
        </Paper>
      </Box>
    </>
  );
}

// Exporta o componente como padrão
export default AddNewReportPage;

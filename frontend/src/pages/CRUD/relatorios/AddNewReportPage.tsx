// Importa o React e o hook useState para gerenciar estados locais do componente
import { useState, useEffect, Fragment, useRef } from "react";
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
  Checkbox,
  Autocomplete,
  FormControl,
  MenuItem,
  Select,
  Breadcrumbs,
  InputLabel,
} from "@mui/material";
import HomeIcon from "@mui/icons-material/Home";
// Importa o hook de autenticação personalizado
import { useAuth } from "../../../hooks/AuthContext";
// Importa o hook useQuery do Apollo Client para consultas GraphQL
import { useLazyQuery } from "@apollo/client/react";
// Importa a query GraphQL para buscar clientes por empresa
import { GET_CLIENTES_BY_EMPRESA } from "../../../graphql/clientesQueries";
// Importa a biblioteca zod para validação de dados
import { z } from "zod";
import { useTheme } from "@mui/material/styles"; // Tema do Material UI
import StyledBreadcrumb from "../../../components/StyledBreadCrumbs"; // Componente de breadcrumb estilizado

// Declaração global para o objeto grecaptcha (Google reCAPTCHA)
declare var grecaptcha: any;

function buildZodSchema(model: any) {
  const shape: Record<string, any> = {
    relatorio_nome: z.string("Campo obrigatório"),
    modelo_id: z.string("ID inválido").min(24).max(24),
    cliente_id: z.string("Selecione um cliente").min(1),
    empresa_id: z.string("ID inválido").min(24),
    recaptchaToken: z.string("Token obrigatório").min(1),
  };

  if (Array.isArray(model.customFields)) {
    model.customFields.forEach((field: any) => {
      const key = field.key.startsWith("custom_") ? field.key : `custom_${field.key}`;
      const value = field.value;

      if (value.datatype === "object") {
        const subShape: Record<string, any> = {};
        Object.entries(value).forEach(([subKey, subValue]: [string, any]) => {
          if (["datatype", "required", "label"].includes(subKey)) return;
          const sanitizedSubKey = subKey.replace(/\s+/g, "_");
          const fullSubKey = sanitizedSubKey.startsWith("custom_") ? sanitizedSubKey : `custom_${sanitizedSubKey}`;

          if (subValue.datatype === "bool") {
            subShape[fullSubKey] = z.boolean().optional();
          } else if (subValue.datatype === "number") {
            subShape[fullSubKey] = subValue.required
              ? z.preprocess(
                  (val) => (val === "" ? undefined : Number(val)),
                  z.number("Preencha este campo com um número válido")
                )
              : z.preprocess((val) => (val === "" ? undefined : Number(val)), z.number().optional());
          } else {
            subShape[fullSubKey] = subValue.required ? z.string("Campo obrigatório") : z.string().optional();
          }
        });
        shape[key] = z.object(subShape);
      } else if (value.datatype === "bool") {
        shape[key] = z.boolean().optional();
      } else if (value.datatype === "number") {
        shape[key] = value.required
          ? z.preprocess(
              (val) => (val === "" ? undefined : Number(val)),
              z.number("Preencha este campo com um número válido")
            )
          : z.preprocess((val) => (val === "" ? undefined : Number(val)), z.number().optional());
      } else {
        shape[key] = value.required ? z.string("Campo obrigatório") : z.string().optional();
      }
    });
  }

  return z.object(shape);
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
  // Estado para mensagem de erro geral
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [clienteInputValue, setClienteInputValue] = useState(""); // <-- Adicione esta linha
  const formTopRef = useRef<HTMLDivElement>(null);
  const theme = useTheme();

  // Executa a query GraphQL para buscar clientes da empresa
  const [getClientes, { data, loading }] = useLazyQuery(GET_CLIENTES_BY_EMPRESA, {
    variables: { empresaId: empresa?.id },
    fetchPolicy: "cache-first",
  });

  useEffect(() => {
    if (empresa?.id) getClientes({ variables: { empresaId: empresa.id } });
  }, [empresa, getClientes]);

  // Se não houver modelo selecionado, exibe mensagem de erro
  if (!selectedModel) {
    return (
      <Typography color="error">
        Nenhum modelo foi selecionado. Volte para a página anterior e selecione um modelo.
      </Typography>
    );
  }

  const schema = buildZodSchema(selectedModel);

  // Função para atualizar o estado dos campos do formulário
  const handleInputChange = (fieldId: string, value: any) => {
    // Detecta se o campo é do tipo number no modelo
    let isNumberField = false;
    if (selectedModel) {
      // Verifica campos simples
      const field = selectedModel.customFields.find((f: any) => f.key === fieldId);
      if (field && field.value.datatype === "number") isNumberField = true;
      // Verifica campos compostos (object)
      selectedModel.customFields.forEach((f: any) => {
        if (f.value.datatype === "object") {
          Object.entries(f.value).forEach(([subKey, subValue]: [string, any]) => {
            const sanitizedSubKey = subKey.replace(/\s+/g, "_");
            const fullSubKey = sanitizedSubKey.startsWith("custom_") ? sanitizedSubKey : `custom_${sanitizedSubKey}`;
            if (fieldId === fullSubKey && subValue.datatype === "number") isNumberField = true;
          });
        }
      });
    }
    // Converte para número se necessário
    const finalValue = isNumberField ? (value === "" ? undefined : Number(value)) : value;
    setFormData((prev) => ({ ...prev, [fieldId]: finalValue }));
  };

  // Função para tratar o envio do formulário
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrors({});
    setErrorMessage(null);

    try {
      const recaptchaToken = await grecaptcha.enterprise.execute("6LdDN-kqAAAAAHYkxo-9PioMLoErWSv1vUvwdig4", {
        action: "register",
      });

      // Garante que todos os campos booleanos estejam presentes no payload
      const booleanKeys: string[] = [];
      selectedModel.customFields.forEach((field: any) => {
        if (field.value.datatype === "bool") {
          booleanKeys.push(field.key);
        }
        if (field.value.datatype === "object") {
          Object.entries(field.value).forEach(([subKey, subValue]: [string, any]) => {
            if (!["datatype", "required", "label"].includes(subKey)) {
              const sanitizedSubKey = subKey.replace(/\s+/g, "_");
              const fullSubKey = sanitizedSubKey.startsWith("custom_") ? sanitizedSubKey : `custom_${sanitizedSubKey}`;
              if (subValue.datatype === "bool") {
                booleanKeys.push(fullSubKey);
              }
            }
          });
        }
      });

      // Preenche booleanos ausentes com false
      const formDataWithBooleans = { ...formData };
      booleanKeys.forEach((key) => {
        if (formDataWithBooleans[key] === undefined) {
          formDataWithBooleans[key] = false;
        }
      });

      // NÃO agrupe subcampos de objetos!
      // Object.entries(objectFields).forEach(([objectKey, subKeys]) => {
      //   const obj: Record<string, any> = {};
      //   subKeys.forEach((subKey) => {
      //     obj[subKey] = formDataWithBooleans[subKey];
      //     delete formDataWithBooleans[subKey];
      //   });
      //   formDataWithBooleans[objectKey] = obj;
      // });

      // Monta o payload inicial
      const allowedKeys = [
        "relatorio_nome",
        "modelo_id",
        "cliente_id",
        "empresa_id",
        "recaptchaToken",
        // ...todos os custom_...
      ];

      // Agrupa subcampos de objetos dentro do campo pai
      const groupedFormData = { ...formDataWithBooleans };
      selectedModel.customFields.forEach((field: any) => {
        if (field.value.datatype === "object") {
          const objectKey = field.key.startsWith("custom_") ? field.key : `custom_${field.key}`;
          const obj: Record<string, any> = {};
          Object.entries(field.value).forEach(([subKey, subValue]: [string, any]) => {
            if (!["datatype", "required", "label"].includes(subKey)) {
              const sanitizedSubKey = subKey.replace(/\s+/g, "_");
              const fullSubKey = sanitizedSubKey.startsWith("custom_") ? sanitizedSubKey : `custom_${sanitizedSubKey}`;
              if (groupedFormData[fullSubKey] !== undefined) {
                obj[fullSubKey] = groupedFormData[fullSubKey];
                delete groupedFormData[fullSubKey];
              }
            }
          });
          groupedFormData[objectKey] = obj;
        }
      });

      const payload = Object.fromEntries(
        Object.entries({
          ...groupedFormData,
          empresa_id: empresa?.id,
          modelo_id: selectedModel._id?.$oid || selectedModel.id,
          recaptchaToken,
        }).filter(([key]) => allowedKeys.includes(key) || key.startsWith("custom_"))
      );

      schema.parse(payload);

      console.log(payload);

      const response = await fetch("/backend/relatorio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
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
        console.log("Erros de validação:", err.issues);

        const fieldErrors: { [key: string]: string } = {};
        err.issues.forEach((e) => {
          let msg = e.message;
          // Trata erro de tipo number undefined
          if (
            e.code === "invalid_type" &&
            e.expected === "number" &&
            msg === "Invalid input: expected number, received undefined"
          ) {
            msg = "Preencha este campo com um número válido";
          }
          if (msg === "Invalid input: expected array, received undefined") {
            msg = "Selecione uma opção";
          }

          // Junta o path para subcampos de objetos. Isto vai permitir exibir o erro corretamente em subcampos.
          const fieldPath = e.path.join(".");
          if (fieldPath) fieldErrors[fieldPath] = msg;
        });
        setErrors(fieldErrors);
      } else {
        // Para outros erros, exibe mensagem geral
        setErrorMessage(err.message || "Erro ao adicionar o relatório.");

        if (formTopRef.current) {
          formTopRef.current.scrollIntoView({ behavior: "smooth", block: "start" }); // Scroll suave até o topo do formulário
        }
      }
    }
  };

  // Renderiza o componente
  return (
    <>
      {/* Breadcrumbs */}
      <Box ref={formTopRef} sx={{ width: "100%", display: "flex", flexDirection: "column", gap: 2, padding: 2 }}>
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
              Modelo: {selectedModel.modeloNome}
            </Typography>
          </Box>
          {/* Formulário */}
          <form onSubmit={handleSubmit} noValidate>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {/* Campo para nome do relatório */}
              <Box sx={{ width: "100%", flexDirection: "column" }}>
                <TextField
                  value={formData.relatorio_nome || ""}
                  label="Nome do Relatório *"
                  onChange={(e) => handleInputChange("relatorio_nome", e.target.value)}
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
                        <Paper
                          elevation={2}
                          sx={{
                            p: 2,
                            mt: 2,
                            mb: 2,
                            borderRadius: 2,
                            backgroundColor: theme.palette.action.hover,
                            border: `1.5px solid ${theme.palette.primary.light}`,
                            boxShadow: theme.shadows[2],
                          }}
                        >
                          <Typography variant="subtitle1" sx={{ fontWeight: "bold", mb: 2 }}>
                            {displayName(baseKey)}
                          </Typography>
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
                                  value={formData[fullSubKey] ?? ""}
                                  onChange={(e) => handleInputChange(fullSubKey, e.target.value)}
                                  error={!!errors[`${baseKey}.${fullSubKey}`]}
                                  helperText={
                                    errors[`${baseKey}.${fullSubKey}`]
                                      ? `${subLabel}: ${errors[`${baseKey}.${fullSubKey}`]}`
                                      : ""
                                  }
                                />
                              </Box>
                            );
                          })}
                        </Paper>
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
                          label={label}
                          type={value.datatype === "number" ? "number" : value.datatype === "date" ? "date" : "text"}
                          value={formData[baseKey] ?? ""}
                          onChange={(e) => handleInputChange(baseKey, e.target.value)}
                          error={!!errors[baseKey]}
                          helperText={errors[baseKey] ? `${label}: ${errors[baseKey]}` : ""}
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
                  options={data?.getClientes?.clientes || []}
                  getOptionLabel={(option) => option.nome}
                  value={data?.getClientes?.clientes.find((c: any) => c.id === formData.cliente_id) || null}
                  onChange={(_, newValue) => {
                    handleInputChange("cliente_id", newValue ? newValue.id : "");
                    setClienteInputValue(newValue ? newValue.nome : "");
                  }}
                  isOptionEqualToValue={(option, value) => option.id === value.id}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Selecione um Cliente *"
                      error={!!errors.cliente_id}
                      helperText={errors.cliente_id}
                      fullWidth
                    />
                  )}
                  loading={loading}
                  openOnFocus
                  autoHighlight
                  inputValue={clienteInputValue}
                  onInputChange={(_, newInputValue, reason) => {
                    setClienteInputValue(newInputValue);
                    if (reason === "input") {
                      getClientes({ variables: { empresaId: empresa?.id, nome: newInputValue } });
                    }
                  }}
                  onOpen={() => {
                    // Busca os primeiros 3 clientes ao abrir (sem filtro de nome)
                    getClientes({ variables: { empresaId: empresa?.id, limit: 3 } });
                  }}
                  slotProps={{
                    clearIndicator: {
                      sx: {
                        background: "none",
                        color: "inherit",
                        boxShadow: "none",
                        "&:hover": {
                          background: "none",
                        },
                      },
                    },
                    popupIndicator: {
                      sx: {
                        background: "none",
                        color: "inherit",
                        boxShadow: "none",
                        "&:hover": {
                          background: "none",
                        },
                      },
                    },
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

function displayName(key: string) {
  // Remove "custom_" e coloca a primeira letra maiúscula
  return key
    .replace(/^custom_/, "")
    .replace(/_/g, " ")
    .replace(/^./, (c) => c.toUpperCase());
}

// Exporta o componente como padrão
export default AddNewReportPage;

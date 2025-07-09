// Importações de bibliotecas e componentes necessários
import { useForm, useFieldArray, Controller } from "react-hook-form"; // Hooks para manipulação de formulários dinâmicos
import { zodResolver } from "@hookform/resolvers/zod"; // Integração do Zod com react-hook-form
import { z } from "zod"; // Validação de esquemas
import { useNavigate, useLocation } from "react-router-dom"; // Navegação entre páginas
import {
  Button,
  Checkbox,
  FormControlLabel,
  MenuItem,
  TextField,
  Box,
  Typography,
  IconButton,
  Paper,
  Select,
  InputLabel,
  FormControl,
  FormHelperText,
} from "@mui/material"; // Componentes de UI do Material UI
import DeleteIcon from "@mui/icons-material/Delete"; // Ícone de deletar
import { useState, useEffect } from "react"; // Hooks do React
import { useAuth } from "../hooks/AuthContext"; // Contexto de autenticação
import { useTheme } from "@mui/material/styles"; // Tema do Material UI
import ArrowCircleUpIcon from "@mui/icons-material/ArrowCircleUp"; // Ícone de scroll para o topo

// Esquema de validação para um subcampo personalizado
const subfieldSchema = z.object({
  name: z.string().min(1, "Nome do subcampo é obrigatório").trim(),
  datatype: z.string().min(1, "Tipo de dados é obrigatório").trim(),
  required: z.boolean(),
});

// Esquema de validação para um campo personalizado
const fieldSchema = z.object({
  name: z.string().min(1, "Nome do subcampo é obrigatório").trim(),
  datatype: z.string().min(1, "Tipo de dados é obrigatório").trim(),
  required: z.boolean(),
  subfields: z.array(subfieldSchema).optional(),
});

// Esquema de validação do formulário principal
const formSchema = z.object({
  modelName: z.string().min(1, "Nome do modelo é obrigatório").trim(), // Nome do modelo obrigatório
  fields: z.array(fieldSchema), // Array de campos personalizados
});

// Novo schema para validação do nome do campo
const newFieldNameSchema = z.string().min(1, "Nome do campo é obrigatório");

// Tipos TypeScript inferidos dos esquemas

type Field = z.infer<typeof fieldSchema>;
type FormSchema = z.infer<typeof formSchema>;

/**
 * Página para criação e edição de modelos de relatórios personalizados.
 * Permite adicionar/remover campos dinâmicos, definir tipos e obrigatoriedade,
 * e submeter o modelo para o backend.
 */
export default function ReportTemplatePage() {
  // Hook para navegação entre páginas
  const navigate = useNavigate();
  const location = useLocation();

  // Recupera informações da empresa autenticada
  const { empresa } = useAuth();

  // Hook para acessar o tema do Material UI
  const theme = useTheme();

  // Verifica se está editando um modelo existente
  const editingModel = location.state?.modelo;
  const isEditing = !!editingModel;

  // Estado para controlar o nome do novo campo a ser adicionado
  const [newFieldName, setNewFieldName] = useState(""); // Nome do novo campo
  const [newFieldError, setNewFieldError] = useState<string | null>(null); // Erro do novo campo

  // Estado para controlar a visibilidade do botão de scroll
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Função para converter customFields do backend para o formato do formulário
  const convertCustomFieldsToFormFields = (customFields: any[]) => {
    return customFields?.map((field: any) => {
      const fieldName = field.key?.replace(/^custom_/, "") || "";
      const fieldValue = field.value;
      
      if (fieldValue?.datatype === "object") {
        // Para campos objeto, extrair subcampos
        const subfields = Object.entries(fieldValue)
          .filter(([key]) => !["datatype", "required"].includes(key))
          .map(([key, val]: any) => ({
            name: key,
            datatype: val.datatype,
            required: val.required
          }));
        
        return {
          name: fieldName,
          datatype: fieldValue.datatype,
          required: fieldValue.required,
          subfields: subfields.length > 0 ? subfields : undefined
        };
      } else {
        return {
          name: fieldName,
          datatype: fieldValue?.datatype || "",
          required: fieldValue?.required || false
        };
      }
    }) || [];
  };

  // Hook do formulário com valores padrão se estiver editando
  const {
    register, // Registra campos do formulário
    handleSubmit, // Handler para submissão
    control, // Controle para campos dinâmicos
    formState: { errors }, // Erros de validação
    reset, // Função para resetar o formulário
  } = useForm<FormSchema>({
    resolver: zodResolver(formSchema), // Usa o Zod para validação
    defaultValues: isEditing ? {
      modelName: editingModel.modelName,
      fields: convertCustomFieldsToFormFields(editingModel.customFields)
    } : {
      modelName: "",
      fields: []
    }
  });

  // Hook para manipular array de campos dinâmicos (adicionar, remover, atualizar)
  const { fields, append, remove, update } = useFieldArray({
    control, // Controle do formulário
    name: "fields", // Nome do campo array
  });

  // useEffect para resetar o formulário quando mudar de modelo
  useEffect(() => {
    if (isEditing) {
      const formattedFields = convertCustomFieldsToFormFields(editingModel.customFields);
      reset({
        modelName: editingModel.modelName,
        fields: formattedFields
      });
    }
  }, [editingModel, isEditing, reset]);

  // Efeito para mostrar/esconder o botão de scroll para o topo conforme o scroll da página
  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 100); // Mostra botão se scroll > 100px
    window.addEventListener("scroll", handleScroll); // Adiciona listener
    return () => window.removeEventListener("scroll", handleScroll); // Remove listener ao desmontar
  }, []);

  /**
   * Adiciona um novo campo personalizado ao array de campos.
   * Valida se o nome não está vazio e não é duplicado.
   */
  const addField = () => {
    try {
      // Validação Zod
      newFieldNameSchema.parse(newFieldName);
      if (fields.some((f) => f.name === newFieldName)) {
        setNewFieldError("Nome do campo já existe!");
        return;
      }
      append({ name: newFieldName, datatype: "", required: false });
      setNewFieldName("");
      setNewFieldError(null);
    } catch (e) {
      if (e instanceof z.ZodError) {
        setNewFieldError(e.errors[0].message);
      } else {
        setNewFieldError("Erro ao validar campo.");
      }
    }
  };

  /**
   * Handler para submissão do formulário.
   * - Executa o reCAPTCHA.
   * - Monta o payload para o backend.
   * - Faz a requisição POST/PUT para criar/atualizar o modelo.
   * - Exibe alertas de sucesso ou erro.
   */
  const onSubmit = async (data: FormSchema) => {
    try {
      // Executa o reCAPTCHA Enterprise
      const recaptchaToken = await window.grecaptcha.enterprise.execute("6LdDN-kqAAAAAHYkxo-9PioMLoErWSv1vUvwdig4", {
        action: "register",
      });

      // Monta o objeto de campos personalizados para o backend
      const customFields: Record<string, any> = {};
      data.fields.forEach((f) => {
        if (f.datatype === "object" && Array.isArray(f.subfields)) {
          // Para campos do tipo objeto, inclui os subcampos
          const subfieldData: Record<string, any> = {};
          f.subfields.forEach((sub) => {
            subfieldData[sub.name] = {
              datatype: sub.datatype,
              required: sub.required,
            };
          });
          customFields[`custom_${f.name}`] = {
            datatype: f.datatype,
            required: f.required,
            ...subfieldData,
          };
        } else {
          customFields[`custom_${f.name}`] = {
            datatype: f.datatype,
            required: f.required,
          };
        }
      });

      // Monta o payload completo
      const payload = {
        model_name: data.modelName,
        empresa_id: typeof empresa === "object" ? empresa?.id : empresa,
        recaptchaToken,
        ...customFields,
      };

      // Usa PUT para edição ou POST para criação
      const method = isEditing ? "PUT" : "POST";
      const url = isEditing ? `/backend/modelo/${editingModel.id}` : "/backend/modelo";
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.detail || `Erro ao ${isEditing ? 'atualizar' : 'criar'} modelo`);

      // Navega de volta com mensagem de sucesso
      navigate("/report-models", {
        state: {
          message: {
            text: `Modelo ${isEditing ? 'atualizado' : 'criado'} com sucesso!`,
            error: false
          }
        }
      });
    } catch (err: any) {
      alert(err.message || `Erro ao ${isEditing ? 'atualizar' : 'criar'} modelo.`);
    }
  };

  // Renderização do componente
  return (
    <>
      {/* Card principal do formulário */}
      <Paper elevation={3} sx={{ maxWidth: 700, mx: "auto", mt: 4, p: 3 }}>
        <Box
          component="form"
          onSubmit={handleSubmit(onSubmit)}
          sx={{ display: "flex", flexDirection: "column", gap: 2 }}
        >
          {/* Título do formulário */}
          <Typography variant="h6">
            {isEditing ? 'Editar Modelo' : 'Criar Modelo'}
          </Typography>

          {/* Campo para nome do modelo */}
          <TextField
            label="Nome do Modelo"
            {...register("modelName")}
            error={!!errors.modelName}
            helperText={errors.modelName?.message}
          />

          {/* Título dos campos personalizados */}
          <Typography variant="h6">Campos Personalizados</Typography>

          {/* Adição de novo campo personalizado */}
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1, width: "100%" }}>
            <TextField
              label="Nome do novo campo"
              value={newFieldName}
              onChange={(e) => {
                setNewFieldName(e.target.value);
                if (newFieldError) setNewFieldError(null); // Limpa erro ao digitar
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault(); // Previne o submit do formulário
                  addField(); // Chama a função de adicionar campo
                }
              }}
              error={!!newFieldError}
              helperText={newFieldError}
              fullWidth
            />
            <Button variant="contained" onClick={addField} type="button" fullWidth>
              Adicionar
            </Button>
          </Box>

          {/* Renderização dos campos personalizados adicionados */}
          <Box sx={{ width: "100%" }}>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2, width: "100%" }}>
              {fields.map((field, index) => (
                <Box
                  key={field.id}
                  sx={{
                    border: "1px solid #ccc",
                    p: 2,
                    borderRadius: 2,
                    display: "flex",
                    flexDirection: "column",
                    gap: 1,
                    width: "100%",
                    mb: 2,
                    minWidth: 250,
                    boxSizing: "border-box",
                  }}
                >
                  {/* Campo para nome do campo personalizado */}
                  <TextField
                    label="Nome do Campo"
                    {...register(`fields.${index}.name`)}
                    defaultValue={field.name}
                    error={!!errors.fields?.[index]?.name}
                    helperText={errors.fields?.[index]?.name?.message}
                    fullWidth
                  />

                  {/* Select para tipo de dado */}
                  <FormControl
                    fullWidth
                    error={!!errors.fields?.[index]?.datatype}
                  >
                    <InputLabel>Tipo de Dados</InputLabel>
                    <Controller
                      control={control}
                      name={`fields.${index}.datatype`}
                      render={({ field: controllerField }) => (
                        <Select
                          {...controllerField}
                          label="Tipo de Dados"
                          sx={{
                            width: "100%",
                            color: theme.palette.mode === "dark" ? "grey.100" : "grey.900",
                            bgcolor: theme.palette.mode === "dark" ? "grey.900" : "grey.100",
                          }}
                          MenuProps={{
                            PaperProps: {
                              sx: {
                                width: "35%",
                                bgcolor: theme.palette.mode === "dark" ? "grey.900" : "grey.100",
                                color: theme.palette.mode === "dark" ? "grey.100" : "grey.900",
                              },
                            },
                          }}
                          onChange={(e) => {
                            controllerField.onChange(e);
                            if (e.target.value === "object") {
                              update(index, {
                                ...fields[index],
                                datatype: "object",
                                subfields: [{ name: "", datatype: "", required: false }],
                              });
                            } else if (Array.isArray((fields[index] as Field).subfields)) {
                              const { subfields, ...rest } = fields[index] as Field;
                              update(index, { ...rest, datatype: e.target.value });
                            }
                          }}
                        >
                          <MenuItem value="string">Texto</MenuItem>
                          <MenuItem value="number">Número</MenuItem>
                          <MenuItem value="bool">Sim/Não</MenuItem>
                          <MenuItem value="date">Data</MenuItem>
                          <MenuItem value="object">Multicampo</MenuItem>
                        </Select>
                      )}
                    />
                    {errors.fields?.[index]?.datatype && (
                      <FormHelperText>
                        {errors.fields?.[index]?.datatype?.message}
                      </FormHelperText>
                    )}
                  </FormControl>
                  <FormControlLabel
                    control={<Checkbox {...register(`fields.${index}.required`)} />}
                    label="Campo Obrigatório"
                  />

                  {/* Renderiza apenas UM subcampo se o tipo for object */}
                  {(fields[index] as Field)?.datatype === "object" && (
                    <Box
                      sx={{
                        mt: 2,
                        pl: 2,
                        borderLeft: "2px solid #ccc",
                        display: "flex",
                        flexDirection: "column",
                        gap: 2,
                        width: "100%",
                      }}
                    >
                      <Typography variant="subtitle2" sx={{ mb: 1 }}>
                        Subcampo
                      </Typography>
                      <TextField
                        label="Nome do Subcampo"
                        value={(fields[index] as Field).subfields?.[0]?.name || ""}
                        onChange={(e) => {
                          const currentSubfields = (fields[index] as Field).subfields || [];
                          const updatedSubfield = {
                            ...(currentSubfields[0] || { name: "", datatype: "", required: false }),
                            name: e.target.value,
                          };
                          update(index, {
                            ...(fields[index] as Field),
                            subfields: [updatedSubfield],
                          });
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault(); // Previne o submit do formulário
                            e.currentTarget.focus(); // Mantém o foco no campo atual
                          }
                        }}
                        size="small"
                        fullWidth
                        sx={{ mb: 1 }}
                      />

                      <FormControl size="small" fullWidth>
                        <InputLabel>Tipo do Subcampo</InputLabel>
                        <Select
                          label="Tipo do Subcampo"
                          value={(fields[index] as Field).subfields?.[0]?.datatype || ""}
                          onChange={(e) => {
                            const currentSubfields = (fields[index] as Field).subfields || [];
                            const updatedSubfield = {
                              ...(currentSubfields[0] || { name: "", datatype: "", required: false }),
                              datatype: e.target.value,
                            };
                            update(index, {
                              ...(fields[index] as Field),
                              subfields: [updatedSubfield],
                            });
                          }}
                          sx={{
                            color: theme.palette.mode === "dark" ? "grey.100" : "grey.900",
                            bgcolor: theme.palette.mode === "dark" ? "grey.900" : "grey.100",
                          }}
                          MenuProps={{
                            PaperProps: {
                              sx: {
                                width: "35%",
                              },
                            },
                          }}
                        >
                          <MenuItem value="string">Texto</MenuItem>
                          <MenuItem value="number">Número</MenuItem>
                          <MenuItem value="bool">Sim/Não</MenuItem>
                          <MenuItem value="date">Data</MenuItem>
                          {/* Removido "object" para evitar ciclo */}
                        </Select>
                      </FormControl>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={!!(fields[index] as Field).subfields?.[0]?.required}
                            onChange={(e) => {
                              const currentSubfields = (fields[index] as Field).subfields || [];
                              const updatedSubfield = {
                                ...(currentSubfields[0] || { name: "", datatype: "", required: false }),
                                required: e.target.checked,
                              };
                              update(index, {
                                ...(fields[index] as Field),
                                subfields: [updatedSubfield],
                              });
                            }}
                          />
                        }
                        label="Subcampo Obrigatório"
                      />
                    </Box>
                  )}

                  {/* Botão para remover campo */}
                  <IconButton
                    onClick={() => remove(index)}
                    type="button"
                    sx={{
                      backgroundColor: "error.main",
                      color: "white",
                      "&:hover": { bgcolor: "error.dark" },
                      alignSelf: "center",
                    }}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Box>
              ))}
            </Box>
          </Box>

          {/* Botões de ação do formulário */}
          <Box sx={{ display: "flex", gap: 2, width: "100%" }}>
            <Button
              variant="outlined"
              onClick={() => navigate("/report-models")}
              sx={{ flex: 1, height: 48, "&:hover": { bgcolor: "grey.300" } }}
            >
              Cancelar
            </Button>
            <Button
              variant="contained"
              type="submit"
              color="success"
              sx={{ flex: 1, height: 48}}
            >
              {isEditing ? 'Atualizar Modelo' : 'Salvar Modelo'}
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* Botão flutuante para rolar para o topo */}
      {showScrollTop && (
        <Box sx={{ position: "fixed", bottom: 18, left: 10, zIndex: 1300 }}>
          <IconButton
            color="primary"
            size="small"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            sx={{
              bgcolor: "primary.main",
              color: "white",
              "&:hover": { bgcolor: "primary.dark" },
            }}
          >
            <ArrowCircleUpIcon fontSize="small" />
          </IconButton>
        </Box>
      )}
    </>
  );
}

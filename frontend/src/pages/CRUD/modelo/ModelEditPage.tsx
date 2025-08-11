// Importações de bibliotecas e componentes necessários
import { useForm, useFieldArray, Controller } from "react-hook-form"; // Adicione useFormContext se necessário
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
  Tooltip,
} from "@mui/material"; // Componentes de UI do Material UI
import DeleteIcon from "@mui/icons-material/Delete"; // Ícone de deletar
import { useState, useEffect } from "react"; // Hooks do React
import { useAuth } from "../../../hooks/AuthContext"; // Contexto de autenticação
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
  items: z.array(z.string().min(1, "Item do array é obrigatório").trim()).optional(),
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

  // Estado para controlar campos removidos
  const [removedFields, setRemovedFields] = useState<string[]>([]);

  // Adicione este estado para guardar nomes originais ao editar
  const [originalFieldNames, setOriginalFieldNames] = useState<string[]>([]);
  const [originalSubfieldNames, setOriginalSubfieldNames] = useState<Record<string, string[]>>({});

  // Função para converter customFields do backend para o formato do formulário
  const convertCustomFieldsToFormFields = (customFields: any[]) => {
    return (
      customFields?.map((field: any) => {
        const fieldName = field.key?.replace(/^custom_/, "") || "";
        const fieldValue = field.value;

        if (fieldValue?.datatype === "object") {
          // Para campos objeto, extrair subcampos
          const subfields = Object.entries(fieldValue)
            .filter(([key]) => !["datatype", "required"].includes(key))
            .map(([key, val]: any) => ({
              // Remove o prefixo custom_ dos subcampos para exibição ao usuário
              name: key.replace(/^custom_/, ""),
              datatype: val.datatype,
              required: val.required,
            }));

          return {
            name: fieldName,
            datatype: fieldValue.datatype,
            required: fieldValue.required,
            subfields: subfields.length > 0 ? subfields : undefined,
          };
        } else if (fieldValue?.datatype === "array") {
          // Corrigido: inclui items
          return {
            name: fieldName,
            datatype: fieldValue.datatype,
            required: fieldValue.required,
            items: Array.isArray(fieldValue.items) ? fieldValue.items : [],
          };
        } else {
          return {
            name: fieldName,
            datatype: fieldValue?.datatype || "",
            required: fieldValue?.required || false,
          };
        }
      }) || []
    );
  };

  // Hook do formulário com valores padrão se estiver editando
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    reset,
    watch,
    setError,
    clearErrors,
  } = useForm<FormSchema>({
    resolver: zodResolver(formSchema),
    defaultValues: isEditing
      ? {
          modelName: editingModel.modelName,
          fields: convertCustomFieldsToFormFields(editingModel.customFields),
        }
      : {
          modelName: "",
          fields: [],
        },
  });

  /* Aqui é onde utilizamos o watch para monitorizar o nome dos campos dinâmicos, permitindo atualizações em tempo real nos formulários filhos, caso se trate de um campo do tipo object ou array  */
  const watchedFields = watch("fields");

  // Hook para manipular array de campos dinâmicos (adicionar, remover, atualizar)
  const { fields, append, remove, update } = useFieldArray({
    control, // Controle do formulário
    name: "fields", // Nome do campo array
  });

  // useEffect para resetar o formulário quando mudar de modelo
  useEffect(() => {
    if (location?.state?.modelo) {
      console.log("Aqui estão os dados do modelo a ser editado: ", location?.state?.modelo);
    }

    if (isEditing) {
      const formattedFields = convertCustomFieldsToFormFields(editingModel.customFields);
      reset({
        modelName: editingModel.modelName,
        fields: formattedFields,
      });
      // Salva nomes originais dos campos e subcampos
      setOriginalFieldNames(formattedFields.map((f: any) => f.name));
      const subfieldsMap: Record<string, string[]> = {};
      formattedFields.forEach((f: any) => {
        if (f.datatype === "object" && Array.isArray(f.subfields)) {
          subfieldsMap[f.name] = f.subfields.map((sf: any) => sf.name);
        }
      });
      setOriginalSubfieldNames(subfieldsMap);
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
        setNewFieldError(e.issues[0].message);
      } else {
        setNewFieldError("Erro ao validar campo.");
      }
    }
  };

  const onSubmit = async (data: FormSchema) => {
    try {
      // Executa o reCAPTCHA Enterprise
      const recaptchaToken = await window.grecaptcha.enterprise.execute("6LdDN-kqAAAAAHYkxo-9PioMLoErWSv1vUvwdig4", {
        action: "register",
      });

      // Monta o objeto de campos personalizados para o backend
      const customFields: Record<string, any> = {};
      data.fields.forEach((f, idx) => {
        if (f?.datatype === "object" && Array.isArray(f.subfields)) {
          const subfieldData: Record<string, any> = {};
          f.subfields.forEach((sub) => {
            subfieldData[`custom_${sub.name}`] = {
              datatype: sub.datatype,
              required: sub.required,
            };
          });
          customFields[`custom_${f.name}`] = {
            datatype: f.datatype,
            required: f.required,
            ...subfieldData,
          };
        } else if (f?.datatype === "array" && Array.isArray(f.items)) {
          customFields[`custom_${f.name}`] = {
            datatype: f.datatype,
            required: f.required,
            items: f.items,
          };
        } else {
          customFields[`custom_${f?.name}`] = {
            datatype: f?.datatype,
            required: f?.required,
          };
        }
      });

      // Adiciona os campos removidos como null ao payload
      removedFields.forEach((fieldName) => {
        customFields[`custom_${fieldName}`] = null;
      });

      // --- NOVO: Detecta renomeações de campos e subcampos ---
      if (isEditing) {
        // Campos renomeados
        originalFieldNames.forEach((origName, idx) => {
          const exists = data.fields.some((f) => f.name === origName);
          if (!exists) {
            // Campo foi renomeado ou removido
            customFields[`custom_${origName}`] = null;
          }
        });
        // Subcampos renomeados
        Object.entries(originalSubfieldNames).forEach(([parent, origSubs]) => {
          // Procura o campo atual correspondente
          const currentField = data.fields.find((f) => f.name === parent && f.datatype === "object");
          if (currentField && Array.isArray(currentField.subfields)) {
            origSubs.forEach((origSub) => {
              const exists = currentField.subfields?.some((sf) => sf.name === origSub);
              if (!exists) {
                // Subcampo foi renomeado ou removido
                // Envia a chave antiga do subcampo como null dentro do campo pai
                if (!customFields[`custom_${parent}`]) {
                  customFields[`custom_${parent}`] = { datatype: "object", required: currentField.required };
                }
                customFields[`custom_${parent}`][`custom_${origSub}`] = null;
              }
            });
          }
        });
      }
      // --- FIM NOVO ---

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

      console.log("Payload enviado:", payload);

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.detail || `Erro ao ${isEditing ? "atualizar" : "criar"} modelo`);

      // Navega de volta com mensagem de sucesso
      navigate("/report-models", {
        state: {
          message: {
            text: `Modelo ${isEditing ? "atualizado" : "criado"} com sucesso!`,
            error: false,
          },
        },
      });
    } catch (err: any) {
      alert(err.message || `Erro ao ${isEditing ? "atualizar" : "criar"} modelo.`);
    }
  };

  // Renderização do componente
  return (
    <>
      {/* Card principal do formulário */}
      <Paper elevation={3} sx={{ maxWidth: 700, mx: "auto", mt: 4, p: 3, mb: 10 }}>
        <Box
          component="form"
          onSubmit={handleSubmit(onSubmit)}
          sx={{ display: "flex", flexDirection: "column", gap: 2 }}
        >
          {/* Título do formulário */}
          <Typography variant="h6">{isEditing ? "Editar Modelo" : "Criar Modelo"}</Typography>

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
                if (e.key === "Enter") {
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
              {fields
                .map((field, index) => ({ field, index }))
                .filter(
                  ({ field }) => field && typeof field === "object" && field.name !== undefined && field.name !== null
                )
                .map(({ field, index }) => (
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
                      error={!!errors.fields?.[index]?.name}
                      helperText={errors.fields?.[index]?.name?.message}
                      fullWidth
                    />

                    {/* Select para tipo de dado */}
                    <FormControl fullWidth error={!!errors.fields?.[index]?.datatype}>
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
                              const value = e.target.value;
                              if (value === "object") {
                                update(index, {
                                  ...fields[index],
                                  datatype: "object",
                                  subfields: [{ name: "", datatype: "", required: false }],
                                  items: undefined, // limpa items se existia
                                });
                              } else if (value === "array") {
                                update(index, {
                                  ...fields[index],
                                  datatype: "array",
                                  items: [],
                                  subfields: undefined, // limpa subfields se existia
                                });
                              } else {
                                // Limpa subfields e items se existiam
                                const { subfields, items, ...rest } = fields[index] as Field;
                                update(index, { ...rest, datatype: value });
                              }
                            }}
                          >
                            <MenuItem value="string">Texto</MenuItem>
                            <MenuItem value="number">Número</MenuItem>
                            <MenuItem value="bool">Sim/Não</MenuItem>
                            <MenuItem value="date">Data</MenuItem>
                            <MenuItem value="object">Multicampo</MenuItem>
                            <MenuItem value="array">Lista</MenuItem>
                          </Select>
                        )}
                      />
                      {errors.fields?.[index]?.datatype && (
                        <FormHelperText>{errors.fields?.[index]?.datatype?.message}</FormHelperText>
                      )}
                    </FormControl>
                    {(fields[index] as Field)?.datatype !== "object" && (
                      <FormControlLabel
                        control={
                          <Controller
                            control={control}
                            name={`fields.${index}.required`}
                            render={({ field }) => (
                              <Checkbox
                                checked={field.value || false} // Garante que o valor inicial seja booleano
                                onChange={(e) => field.onChange(e.target.checked)} // Atualiza o estado corretamente
                              />
                            )}
                          />
                        }
                        label="Campo Obrigatório"
                      />
                    )}
                    {/* Renderiza UI para inserir opções do campo array */}
                    {(fields[index] as Field)?.datatype === "array" && (
                      <Box
                        sx={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 2,
                          width: "100%",
                          mt: 2,
                          border: "2px solid #ccc",
                          borderRadius: 1,
                          p: 2,
                          boxShadow: 2,
                        }}
                      >
                        <Typography
                          variant="h6"
                          sx={{
                            textAlign: "center",
                            fontWeight: "bold",
                            color: "primary.main",
                            letterSpacing: 1,
                            mb: 1,
                          }}
                        >
                          Opções de <strong>{watchedFields?.[index]?.name || ""}</strong>
                        </Typography>
                        <Controller
                          control={control}
                          name={`fields.${index}.items`}
                          render={({ field }) => {
                            const items: string[] = Array.isArray(field.value) ? field.value : [];
                            const [inputValue, setInputValue] = useState("");

                            const addItem = () => {
                              const trimmed = inputValue.trim();
                              if (trimmed && !items.includes(trimmed)) {
                                field.onChange([...items, trimmed]);
                                setInputValue("");
                              }
                            };

                            const removeItem = (removeIdx: number) => {
                              field.onChange(items.filter((_, idx) => idx !== removeIdx));
                            };

                            return (
                              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, alignItems: "center" }}>
                                  <TextField
                                    label="Nova opção"
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    size="small"
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        e.preventDefault();
                                        addItem();
                                      }
                                    }}
                                    fullWidth
                                    sx={{
                                      bgcolor: theme.palette.mode === "dark" ? "grey.900" : "grey.100",
                                      color: theme.palette.mode === "dark" ? "grey.100" : "grey.900",
                                      "& .MuiInputBase-input": {
                                        color: theme.palette.mode === "dark" ? "grey.100" : "grey.900",
                                      },
                                    }}
                                  />
                                  <Button
                                    variant="contained"
                                    onClick={addItem}
                                    type="button"
                                    sx={{
                                      height: 40,
                                      fontWeight: "bold",
                                      bgcolor: "primary.main",
                                      color: "white",
                                      "&:hover": { bgcolor: "primary.dark" },
                                    }}
                                  >
                                    Adicionar
                                  </Button>
                                </Box>
                                <Box
                                  sx={{
                                    display: "flex",
                                    flexDirection: "column",
                                    width: "100%",
                                    gap: 1,
                                    mt: 1,
                                  }}
                                >
                                  {items.length === 0 && (
                                    <Typography variant="body2" sx={{ color: "text.secondary", textAlign: "center" }}>
                                      Nenhuma opção adicionada ainda.
                                    </Typography>
                                  )}
                                  {items.map((item, idx) => (
                                    <Box
                                      key={item + idx}
                                      sx={{
                                        display: "flex",
                                        flexDirection: "row",
                                        alignItems: "center",
                                        width: "100%",
                                        justifyContent: "space-between",
                                        bgcolor: theme.palette.mode === "dark" ? "grey.800" : "grey.200",
                                        borderRadius: 1,
                                        px: 2,
                                        py: 1,
                                        boxShadow: 1,
                                      }}
                                    >
                                      <Typography
                                        variant="body1"
                                        sx={{
                                          fontWeight: 500,
                                          color: theme.palette.mode === "dark" ? "grey.100" : "grey.900",
                                        }}
                                      >
                                        {idx + 1}- {item}
                                      </Typography>
                                      <IconButton
                                        size="small"
                                        onClick={() => removeItem(idx)}
                                        sx={{
                                          backgroundColor: "error.main",
                                          color: "white",
                                          "&:hover": { bgcolor: "error.dark" },
                                          alignSelf: "center",
                                        }}
                                      >
                                        <DeleteIcon fontSize="small" />
                                      </IconButton>
                                    </Box>
                                  ))}
                                </Box>
                              </Box>
                            );
                          }}
                        />
                      </Box>
                    )}
                    {/* Renderiza UI para campos do tipo objeto */}
                    {(fields[index] as Field)?.datatype === "object" && (
                      <Box
                        sx={{
                          mt: 2,
                          pl: 2,
                          border: "1px solid #ccc",
                          borderRadius: 1,
                          display: "flex",
                          flexDirection: "column",
                          gap: 2,
                          width: "100%",
                        }}
                      >
                        <Typography variant="h6" sx={{ mt: 1 }}>
                          Subcampos de <strong>{watchedFields?.[index]?.name || ""}</strong>
                        </Typography>
                        {/* Renderiza todos os subfields */}
                        {(fields[index] as Field).subfields?.map((subfield, subIdx) => (
                          <Box
                            key={subIdx}
                            sx={{
                              mb: 2,
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              justifyContent: "center",
                              width: "100%",
                            }}
                          >
                            <Controller
                              control={control}
                              name={`fields.${index}.subfields.${subIdx}.name`}
                              render={({ field }) => (
                                <TextField
                                  label={`Nome do Subcampo ${subIdx + 1}`}
                                  {...register(`fields.${index}.subfields.${subIdx}.name`)}
                                  size="small"
                                  fullWidth
                                  sx={{ mb: 1 }}
                                  error={!!errors.fields?.[index]?.subfields?.[subIdx]?.name}
                                  helperText={errors.fields?.[index]?.subfields?.[subIdx]?.name?.message}
                                />
                              )}
                            />
                            <FormControl
                              size="small"
                              fullWidth
                              sx={{ mb: 1 }}
                              error={!!errors.fields?.[index]?.subfields?.[subIdx]?.datatype}
                            >
                              <InputLabel>Tipo do Subcampo</InputLabel>
                              <Select
                                label="Tipo do Subcampo"
                                value={subfield.datatype || ""}
                                onChange={(e) => {
                                  const currentSubfields = (fields[index] as Field).subfields || [];
                                  const updatedSubfield = {
                                    ...(currentSubfields[subIdx] || { name: "", datatype: "", required: false }),
                                    datatype: e.target.value,
                                  };
                                  const updatedSubfields = [...currentSubfields];
                                  updatedSubfields[subIdx] = updatedSubfield;
                                  update(index, {
                                    ...(fields[index] as Field),
                                    subfields: updatedSubfields,
                                  });
                                  // Limpa erro se preenchido
                                  if (e.target.value.trim()) {
                                    clearErrors(`fields.${index}.subfields.${subIdx}.datatype`);
                                  }
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
                              </Select>
                              {errors.fields?.[index]?.subfields?.[subIdx]?.datatype && (
                                <FormHelperText>
                                  {errors.fields?.[index]?.subfields?.[subIdx]?.datatype?.message}
                                </FormHelperText>
                              )}
                            </FormControl>
                            <Controller
                              control={control}
                              name={`fields.${index}.subfields.${subIdx}.required`}
                              render={({ field }) => (
                                <FormControlLabel
                                  control={
                                    <Checkbox
                                      checked={!!field.value}
                                      onChange={(e) => field.onChange(e.target.checked)}
                                    />
                                  }
                                  label="Subcampo Obrigatório"
                                />
                              )}
                            />
                            {/* Botão para remover subfield */}
                            <IconButton
                              size="small"
                              onClick={() => {
                                const currentSubfields = (fields[index] as Field).subfields || [];
                                const updatedSubfields = currentSubfields.filter((_, i) => i !== subIdx);
                                update(index, {
                                  ...(fields[index] as Field),
                                  subfields: updatedSubfields,
                                });
                              }}
                              sx={{
                                backgroundColor: "error.main",
                                color: "white",
                                "&:hover": { bgcolor: "error.dark" },
                                alignSelf: "center",
                                mt: 1,
                              }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        ))}
                        {/* Botão para adicionar novo subfield */}
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => {
                            const currentSubfields = (fields[index] as Field).subfields || [];
                            if (
                              currentSubfields.length > 0 &&
                              (!currentSubfields[currentSubfields.length - 1].name.trim() ||
                                !currentSubfields[currentSubfields.length - 1].datatype.trim())
                            ) {
                              setError(`fields.${index}.subfields.${currentSubfields.length - 1}.name`, {
                                type: "manual",
                                message: "Preencha o nome do subcampo.",
                              });
                              setError(`fields.${index}.subfields.${currentSubfields.length - 1}.datatype`, {
                                type: "manual",
                                message: "Preencha o tipo do subcampo.",
                              });
                              return;
                            }
                            update(index, {
                              ...(fields[index] as Field),
                              subfields: [...currentSubfields, { name: "", datatype: "", required: false }],
                            });
                          }}
                          sx={{ mt: 1, alignSelf: "flex-start" }}
                        >
                          Adicionar Subcampo
                        </Button>
                      </Box>
                    )}
                    {/* Botão para remover campo */}
                    <IconButton
                      onClick={() => {
                        if (isEditing) {
                          setRemovedFields((prev) => [...prev, fields[index].name]);
                        }
                        remove(index); // Remove do formulário sempre
                      }}
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
            <Button variant="contained" type="submit" color="success" sx={{ flex: 1, height: 48 }}>
              {isEditing ? "Atualizar Modelo" : "Salvar Modelo"}
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* Botão flutuante para rolar para o topo */}
      {showScrollTop && (
        <Tooltip
          title="Adicionar novo campo"
          placement="top"
          slotProps={{
            popper: {
              modifiers: [
                {
                  name: "offset",
                  options: {
                    offset: [10, -3], // leve espaço vertical apenas, sem deslocamento lateral
                  },
                },
              ],
            },
          }}
        >
          <Box sx={{ position: "fixed", bottom: 18, left: 45, zIndex: 1300 }}>
            <IconButton
              color="primary"
              size="small"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              sx={{
                bgcolor: "primary.main",
                color: "white",
                "&:hover": { bgcolor: "primary.dark" },
                width: 45,
                height: 45,
              }}
            >
              <ArrowCircleUpIcon fontSize="small" />
            </IconButton>
          </Box>
        </Tooltip>
      )}
    </>
  );
}

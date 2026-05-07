// Importações de bibliotecas e componentes necessários
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate, useLocation } from "react-router-dom";
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
  Breadcrumbs,
  Card,
  CardContent,
  Divider,
  Chip,
  Alert,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import ArrowCircleUpIcon from "@mui/icons-material/ArrowCircleUp";
import HomeIcon from "@mui/icons-material/Home";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "../../../hooks/AuthContext";
import { useTheme } from "@mui/material/styles";
import StyledBreadcrumb from "../../../components/StyledBreadCrumbs";
import Notification from "../../../components/Notification";
import { useCreateModeloMutation, useUpdateModeloMutation } from "../../../features/modelos/hooks";

// Esquema de validação para um subcampo personalizado
const subfieldSchema = z.object({
  name: z.string().min(3, "Nome do subcampo deve ter pelo menos 3 caracteres").trim(),
  datatype: z.string().min(1, "Tipo de dados é obrigatório").trim(),
  required: z.boolean(),
});

// Esquema de validação para um campo personalizado
const fieldSchema = z
  .object({
    name: z.string().min(1, "Nome do subcampo é obrigatório").trim(),
    datatype: z.string().min(1, "Tipo de dados é obrigatório").trim(),
    required: z.boolean(),
    items: z.array(z.string().min(1, "Item do array é obrigatório").trim()).optional(),
    subfields: z.array(subfieldSchema).optional(),
  })
  .superRefine((field, ctx) => {
    if (field.datatype === "array" && (!field.items || field.items.length === 0)) {
      ctx.addIssue({
        code: "custom",
        path: ["items"],
        message: "Campos do tipo Lista devem ter pelo menos um elemento.",
      });
    }
  });

// Esquema de validação do formulário principal
const formSchema = z.object({
  modeloNome: z.string().min(1, "Nome do modelo é obrigatório").trim(),
  fields: z.array(fieldSchema),
});

// Novo schema para validação do nome do campo
const newFieldNameSchema = z.string().min(3, "Nome do campo deve ter pelo menos 3 caracteres");

// Tipos TypeScript inferidos dos esquemas
type Field = z.infer<typeof fieldSchema>;
type FormSchema = z.infer<typeof formSchema>;

// ============ COMPONENTE FIELD CARD ============
interface FieldCardProps {
  field: Field;
  index: number;
  errors: any;
  register: any;
  control: any;
  update: any;
  remove: any;
  theme: any;
  watchedFields: any[];
  isEditing: boolean;
  setRemovedFields: any;
  setError: any;
  clearErrors: any;
  fieldRefs: React.RefObject<(HTMLDivElement | null)[]>;
  isFreePlan: boolean;
}

const FieldCard = ({
  field,
  index,
  errors,
  register,
  control,
  update,
  remove,
  theme,
  watchedFields,
  isEditing,
  setRemovedFields,
  setError,
  clearErrors,
  fieldRefs,
  isFreePlan,
}: FieldCardProps & { isFreePlan: boolean }) => {
  const getDatatypeLabel = (datatype: string, isFreePlan: boolean) => {
    const types: Record<string, string> = {
      string: "📝 Texto",
      number: "🔢 Número",
      bool: "✓ Sim/Não",
      date: "📅 Data",
    };

    if (!isFreePlan) {
      types.object = "📦 Multicampo";
      types.array = "📋 Lista";
      types.critério = "⚙️ Critério";
    }

    return types[datatype] || datatype;
  };

  return (
    <Card
      ref={(el) => {
        fieldRefs.current[index] = el;
      }}
      elevation={2}
      sx={{
        borderRadius: 2,
        overflow: "hidden",
        borderLeft: "4px solid",
        borderLeftColor: field.datatype ? "primary.main" : "warning.main",
        backgroundColor: theme.palette.mode === "dark" ? "grey.900" : "grey.50",
        transition: "all 0.3s ease",
        "&:hover": {
          boxShadow: 4,
          transform: "translateY(-2px)",
        },
      }}
    >
      <CardContent sx={{ p: 3 }}>
        {/* Header do campo */}
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2.5 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Chip label={`Campo ${index + 1}`} size="small" color="primary" variant="outlined" />
            {field.datatype && (
              <Chip
                label={getDatatypeLabel(field.datatype, isFreePlan)}
                size="small"
                variant="filled"
                color={field.datatype === "object" ? "warning" : "info"}
              />
            )}
          </Box>
          <IconButton
            onClick={() => {
              if (isEditing) {
                setRemovedFields((prev: string[]) => [...prev, field.name]);
              }
              remove(index);
            }}
            size="small"
            sx={{
              backgroundColor: "error.main",
              color: "white",
              "&:hover": { backgroundColor: "error.light" },
            }}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>

        <Divider sx={{ mb: 2.5 }} />

        {/* Nome do Campo */}
        <Box sx={{ mb: 2.5 }}>
          <TextField
            label="Nome do Campo"
            {...register(`fields.${index}.name`)}
            error={!!errors.fields?.[index]?.name}
            helperText={errors.fields?.[index]?.name?.message}
            fullWidth
            size="small"
            placeholder="Ex: Nome, Email, Telefone"
          />
        </Box>

        {/* Tipo de Dados */}
        <Box sx={{ mb: 2.5 }}>
          <FormControl fullWidth size="small" error={!!errors.fields?.[index]?.datatype}>
            <InputLabel>Tipo de Dados</InputLabel>
            <Controller
              control={control}
              name={`fields.${index}.datatype`}
              render={({ field: controllerField }) => (
                <Select
                  {...controllerField}
                  label="Tipo de Dados"
                  onChange={(e) => {
                    controllerField.onChange(e);
                    const value = e.target.value;
                    if (value === "object") {
                      update(index, {
                        ...field,
                        datatype: "object",
                        subfields: [{ name: "", datatype: "", required: false }],
                        items: undefined,
                      });
                    } else if (value === "array") {
                      update(index, {
                        ...field,
                        datatype: "array",
                        items: [],
                        subfields: undefined,
                      });
                    } else {
                      const { subfields, items, ...rest } = field as Field;
                      update(index, { ...rest, datatype: value });
                    }
                  }}
                  MenuProps={{
                    slotProps: {
                      paper: {
                        style: {
                          maxHeight: 200, // Limit the height of the dropdown
                          width: 100, // Match the width of the input field
                        },
                        anchorOrigin: {
                          vertical: "bottom",
                          horizontal: "left",
                        },
                        transformOrigin: {
                          vertical: "top",
                          horizontal: "left",
                        },
                      },
                    },
                  }}
                >
                  <MenuItem value="string">📝 Texto</MenuItem>
                  <MenuItem value="number">🔢 Número</MenuItem>
                  <MenuItem value="bool">✓ Sim/Não</MenuItem>
                  <MenuItem value="date">📅 Data</MenuItem>
                  {!isFreePlan && (
                    <>
                      <MenuItem value="object">📦 Multicampo</MenuItem>
                      <MenuItem value="array">📋 Lista</MenuItem>
                      <MenuItem value="critério">⚙️ Critério</MenuItem>
                    </>
                  )}
                </Select>
              )}
            />
            {errors.fields?.[index]?.datatype && (
              <FormHelperText>{errors.fields?.[index]?.datatype?.message}</FormHelperText>
            )}
          </FormControl>
        </Box>

        {/* Checkbox Campo Obrigatório */}
        {(field as Field)?.datatype !== "object" && (
          <Box sx={{ mb: 2.5 }}>
            <FormControlLabel
              control={
                <Controller
                  control={control}
                  name={`fields.${index}.required`}
                  render={({ field }) => (
                    <Checkbox checked={field.value || false} onChange={(e) => field.onChange(e.target.checked)} />
                  )}
                />
              }
              label="Campo Obrigatório"
            />
          </Box>
        )}

        {/* Seção de Items (para array) */}
        {(field as Field)?.datatype === "array" && (
          <ArrayFieldSection
            index={index}
            field={field}
            control={control}
            fieldState={errors.fields?.[index]?.items}
            watchedFieldName={watchedFields?.[index]?.name || ""}
            theme={theme}
          />
        )}

        {/* Seção de Subfields (para object) */}
        {(field as Field)?.datatype === "object" && (
          <ObjectFieldSection
            index={index}
            field={field}
            control={control}
            register={register}
            errors={errors}
            update={update}
            theme={theme}
            setError={setError}
            clearErrors={clearErrors}
            watchedFieldName={watchedFields?.[index]?.name || ""}
          />
        )}
      </CardContent>
    </Card>
  );
};

// ============ COMPONENTE ARRAY FIELD SECTION ============
interface ArrayFieldSectionProps {
  index: number;
  field: Field;
  control: any;
  fieldState: any;
  watchedFieldName: string;
  theme: any;
}

const ArrayFieldSection = ({ index, control, watchedFieldName, theme }: ArrayFieldSectionProps) => {
  return (
    <Box
      sx={{
        mt: 3,
        p: 2.5,
        borderRadius: 2,
        backgroundColor: theme.palette.mode === "dark" ? "rgba(76, 175, 80, 0.1)" : "rgba(76, 175, 80, 0.05)",
        border: "2px solid",
        borderColor: "success.light",
      }}
    >
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, color: "success.main" }}>
        📋 Opções de "{watchedFieldName}"
      </Typography>

      <Controller
        control={control}
        name={`fields.${index}.items`}
        render={({ field: fieldProps }) => {
          const items: string[] = Array.isArray(fieldProps.value) ? fieldProps.value : [];
          const [inputValue, setInputValue] = useState("");

          const addItem = () => {
            const trimmed = inputValue.trim();
            if (trimmed && items.indexOf(trimmed) === -1) {
              fieldProps.onChange([...items, trimmed]);
              setInputValue("");
            }
          };

          const removeItem = (removeIdx: number) => {
            fieldProps.onChange(items.filter((_, idx) => idx !== removeIdx));
          };

          return (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <Box sx={{ display: "flex", gap: 1 }}>
                <TextField
                  label="Nova opção"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addItem();
                    }
                  }}
                  size="small"
                  fullWidth
                  placeholder="Digite e pressione Enter"
                />
                <Button
                  variant="contained"
                  type="button"
                  size="small"
                  onClick={addItem}
                  startIcon={<AddIcon />}
                  sx={{ minWidth: 100 }}
                >
                  Adicionar
                </Button>
              </Box>

              {items.length === 0 ? (
                <Alert severity="info" sx={{ fontSize: "0.85rem" }}>
                  Nenhuma opção adicionada
                </Alert>
              ) : (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  {items.map((item, idx) => (
                    <Box
                      key={`${item}-${idx}`}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        p: 1.5,
                        borderRadius: 1,
                        backgroundColor: "background.paper",
                        border: "1px solid",
                        borderColor: "divider",
                      }}
                    >
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {idx + 1}. {item}
                      </Typography>
                      <IconButton
                        size="small"
                        onClick={() => removeItem(idx)}
                        sx={{
                          backgroundColor: "error.light",
                          color: "error.main",
                          "&:hover": { backgroundColor: "error.main", color: "white" },
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  ))}
                </Box>
              )}
            </Box>
          );
        }}
      />
    </Box>
  );
};

// ============ COMPONENTE OBJECT FIELD SECTION ============
interface ObjectFieldSectionProps {
  index: number;
  field: Field;
  control: any;
  register: any;
  errors: any;
  update: any;
  theme: any;
  setError: any;
  clearErrors: any;
  watchedFieldName: string;
}

const ObjectFieldSection = ({
  index,
  field,
  control,
  register,
  errors,
  update,
  theme,
  setError,
  clearErrors,
  watchedFieldName,
}: ObjectFieldSectionProps) => {
  return (
    <Box
      sx={{
        mt: 3,
        p: 2.5,
        borderRadius: 2,
        backgroundColor: theme.palette.mode === "dark" ? "rgba(255, 193, 7, 0.1)" : "rgba(255, 193, 7, 0.05)",
        border: "2px solid",
        borderColor: "warning.light",
      }}
    >
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "warning.main" }}>
          📦 Subcampos de "{watchedFieldName}"
        </Typography>
        <Chip label={`${(field as Field).subfields?.length || 0} subcampo(s)`} size="small" />
      </Box>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {(field as Field).subfields?.map((subfield, subIdx) => (
          <SubfieldRow
            key={subIdx}
            index={index}
            subIdx={subIdx}
            subfield={subfield}
            register={register}
            control={control}
            errors={errors}
            update={update}
            field={field}
            clearErrors={clearErrors}
          />
        ))}
      </Box>

      <Button
        variant="outlined"
        size="small"
        startIcon={<AddIcon />}
        onClick={() => {
          const currentSubfields = (field as Field).subfields || [];
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
            ...(field as Field),
            subfields: [...currentSubfields, { name: "", datatype: "", required: false }],
          });
        }}
        sx={{ mt: 2, alignSelf: "flex-start" }}
      >
        Adicionar Subcampo
      </Button>
    </Box>
  );
};

// ============ COMPONENTE SUBFIELD ROW ============
interface SubfieldRowProps {
  index: number;
  subIdx: number;
  subfield: any;
  register: any;
  control: any;
  errors: any;
  update: any;
  field: Field;
  clearErrors: any;
}

const SubfieldRow = ({
  index,
  subIdx,
  subfield,
  register,
  control,
  errors,
  update,
  field,
  clearErrors,
}: SubfieldRowProps) => {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        backgroundColor: "background.paper",
        border: "1px solid",
        borderColor: "divider",
        display: "flex",
        flexDirection: "column",
        gap: 1.5,
      }}
    >
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Typography variant="caption" sx={{ fontWeight: 600, color: "text.secondary" }}>
          Subcampo {subIdx + 1}
        </Typography>
        <IconButton
          size="small"
          onClick={() => {
            const currentSubfields = (field as Field).subfields || [];
            const updatedSubfields = currentSubfields.filter((_, i) => i !== subIdx);
            update(index, {
              ...(field as Field),
              subfields: updatedSubfields,
            });
          }}
          sx={{
            backgroundColor: "error.light",
            color: "error.main",
            "&:hover": { backgroundColor: "error.main", color: "white" },
          }}
        >
          <DeleteIcon fontSize="small" />
        </IconButton>
      </Box>

      <TextField
        label="Nome do Subcampo"
        {...register(`fields.${index}.subfields.${subIdx}.name`)}
        size="small"
        fullWidth
        error={!!errors.fields?.[index]?.subfields?.[subIdx]?.name}
        helperText={errors.fields?.[index]?.subfields?.[subIdx]?.name?.message}
        placeholder="Ex: Primeiro Nome"
      />

      <FormControl size="small" fullWidth error={!!errors.fields?.[index]?.subfields?.[subIdx]?.datatype}>
        <InputLabel>Tipo do Subcampo</InputLabel>
        <Select
          label="Tipo do Subcampo"
          value={subfield.datatype || ""}
          onChange={(e) => {
            const currentSubfields = (field as Field).subfields || [];
            const updatedSubfield = {
              ...(currentSubfields[subIdx] || { name: "", datatype: "", required: false }),
              datatype: e.target.value,
            };
            const updatedSubfields = [...currentSubfields];
            updatedSubfields[subIdx] = updatedSubfield;
            update(index, {
              ...(field as Field),
              subfields: updatedSubfields,
            });
            if (e.target.value.trim()) {
              clearErrors(`fields.${index}.subfields.${subIdx}.datatype`);
            }
          }}
        >
          <MenuItem value="string">📝 Texto</MenuItem>
          <MenuItem value="number">🔢 Número</MenuItem>
          <MenuItem value="bool">✓ Sim/Não</MenuItem>
          <MenuItem value="date">📅 Data</MenuItem>
        </Select>
        {errors.fields?.[index]?.subfields?.[subIdx]?.datatype && (
          <FormHelperText>{errors.fields?.[index]?.subfields?.[subIdx]?.datatype?.message}</FormHelperText>
        )}
      </FormControl>

      <FormControlLabel
        control={
          <Controller
            control={control}
            name={`fields.${index}.subfields.${subIdx}.required`}
            render={({ field }) => (
              <Checkbox checked={!!field.value} onChange={(e) => field.onChange(e.target.checked)} />
            )}
          />
        }
        label="Obrigatório"
      />
    </Paper>
  );
};

// ============ COMPONENTE PRINCIPAL ============
export default function ReportTemplatePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { empresa, user } = useAuth();
  const theme = useTheme();

  const editingModel = location.state?.modelo;
  const isEditing = !!editingModel;

  const [alert, setAlert] = useState<{ message: string; isError: boolean; onConfirm?: () => void } | null>(null);
  const [newFieldName, setNewFieldName] = useState("");
  const [newFieldError, setNewFieldError] = useState<string | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [removedFields, setRemovedFields] = useState<string[]>([]);
  const [originalFieldNames, setOriginalFieldNames] = useState<string[]>([]);
  const [originalSubfieldNames, setOriginalSubfieldNames] = useState<Record<string, string[]>>({});
  const createModeloMutation = useCreateModeloMutation<any>();
  const updateModeloMutation = useUpdateModeloMutation<any>();

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
          modeloNome: editingModel.modeloNome,
        }
      : {
          modeloNome: "",
          fields: [],
        },
  });

  const watchedFields = watch("fields");

  const { fields, append, remove, update } = useFieldArray({
    control,
    name: "fields",
  });

  useEffect(() => {
    if (isEditing) {
      const formattedFields = convertCustomFieldsToFormFields(editingModel.customFields);
      reset({
        modeloNome: editingModel.modeloNome,
        fields: formattedFields,
      });
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

  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 100);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const convertCustomFieldsToFormFields = (customFields: any[]) => {
    function ordenarPorIndice(obj: any) {
      if (obj.datatype === "object") {
        const fixedFields = ["datatype", "required", "indice"];
        const subfields = Object.keys(obj)
          .filter((k) => fixedFields.indexOf(k) === -1)
          .sort((a, b) => obj[a].indice - obj[b].indice);

        const newObj: Record<string, any> = {};
        fixedFields.forEach((f) => {
          if (obj[f] !== undefined) newObj[f] = obj[f];
        });
        subfields.forEach((f) => (newObj[f] = obj[f]));
        return newObj;
      }
      return obj;
    }

    const sortedData = customFields
      .map((item) => ({ ...item, value: ordenarPorIndice(item.value) }))
      .sort((a, b) => a.value.indice - b.value.indice);

    return (
      sortedData?.map((field: any) => {
        const fieldName = field.key?.replace(/^custom_/, "") || "";
        const fieldValue = field.value;

        if (fieldValue?.datatype === "object") {
          const subfields = (Object.entries(fieldValue) as Array<[string, any]>)
            .filter(([key]) => ["datatype", "required", "indice"].indexOf(key) === -1)
            .map(([key, val]: any) => ({
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

  const addField = () => {
    try {
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
      if (fields.length === 0) {
        throw new Error("Adicione pelo menos um campo personalizado.");
      }

      const customFields: Record<string, any> = {};
      data.fields.forEach((f) => {
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

      removedFields.forEach((fieldName) => {
        customFields[`custom_${fieldName}`] = null;
      });

      if (isEditing) {
        originalFieldNames.forEach((origName) => {
          const exists = data.fields.some((f) => f.name === origName);
          if (!exists) {
            customFields[`custom_${origName}`] = null;
          }
        });
        (Object.entries(originalSubfieldNames) as Array<[string, string[]]>).forEach(([parent, origSubs]) => {
          const currentField = data.fields.find((f) => f.name === parent && f.datatype === "object");
          if (currentField && Array.isArray(currentField.subfields)) {
            (origSubs as string[]).forEach((origSub: string) => {
              const exists = currentField.subfields?.some((sf) => sf.name === origSub);
              if (!exists) {
                if (!customFields[`custom_${parent}`]) {
                  customFields[`custom_${parent}`] = { datatype: "object", required: currentField.required };
                }
                customFields[`custom_${parent}`][`custom_${origSub}`] = null;
              }
            });
          }
        });
      }

      const payload = {
        modelo_nome: data.modeloNome,
        empresa_id: typeof empresa === "object" ? empresa?.id : empresa,
        ...customFields,
      };

      console.log("Payload enviado:", payload);
      if (isEditing) {
        await updateModeloMutation.mutateAsync({ id: editingModel.id, payload });
      } else {
        await createModeloMutation.mutateAsync(payload);
      }

      navigate("/report-models", {
        state: {
          message: {
            text: `Modelo ${isEditing ? "atualizado" : "criado"} com sucesso!`,
            error: false,
          },
        },
      });
    } catch (err: any) {
      setAlert({ message: err.message || `Erro ao ${isEditing ? "atualizar" : "criar"} modelo`, isError: true });
    }
  };

  const modeloNomeRef = useRef<HTMLInputElement>(null);
  const fieldRefs = useRef<(HTMLDivElement | null)[]>([]);

  const handleFormSubmit = handleSubmit(
    async (data) => {
      await onSubmit(data);
    },
    (formErrors) => {
      if (formErrors.modeloNome) {
        modeloNomeRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        modeloNomeRef.current?.focus();
        return;
      }
      if (formErrors.fields && Array.isArray(formErrors.fields)) {
        for (let i = 0; i < formErrors.fields.length; i++) {
          if (formErrors.fields[i]) {
            fieldRefs.current[i]?.scrollIntoView({ behavior: "smooth", block: "center" });
            break;
          }
        }
      }
    }
  );

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background:
          theme.palette.mode === "dark"
            ? "linear-gradient(135deg, #1e1e2e 0%, #0f3460 100%)"
            : "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
        py: 4,
      }}
    >
      <Notification alert={alert} setAlert={setAlert} />

      <Box sx={{ maxWidth: 900, mx: "auto", px: { xs: 2, md: 0 } }}>
        {/* Breadcrumbs */}
        <Box sx={{ mb: 3 }}>
          <Breadcrumbs
            aria-label="breadcrumb"
            sx={{
              backgroundColor: "background.paper",
              borderRadius: 2,
              p: 1.5,
              boxShadow: 1,
              backdropFilter: "blur(10px)",
              display: "inline-flex",
            }}
          >
            <StyledBreadcrumb
              onClick={() => navigate("/")}
              icon={<HomeIcon fontSize="small" sx={{ fontSize: "1.8rem" }} />}
            />
            <StyledBreadcrumb label="Modelos" onClick={() => navigate("/report-models")} />
            <StyledBreadcrumb label={isEditing ? "Editar Modelo" : "Novo Modelo"} />
          </Breadcrumbs>
        </Box>

        {/* Card Principal */}
        <Card
          elevation={4}
          sx={{
            borderRadius: 3,
            overflow: "hidden",
            backgroundColor: "background.paper",
            boxShadow: theme.palette.mode === "dark" ? "0 8px 32px rgba(0,0,0,0.4)" : "0 8px 32px rgba(0,0,0,0.1)",
          }}
        >
          {/* Header */}
          <Box
            sx={{
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              p: 3,
              color: "white",
            }}
          >
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              {isEditing ? "📝 Editar Modelo" : "✨ Criar Novo Modelo"}
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.5, opacity: 0.9 }}>
              {isEditing
                ? "Atualize as configurações e campos do seu modelo"
                : "Configure os campos personalizados do seu modelo"}
            </Typography>
          </Box>

          {/* Conteúdo */}
          <CardContent sx={{ p: 4 }}>
            <Box component="form" onSubmit={handleFormSubmit} sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
              {/* Seção 1: Nome do Modelo */}
              <Box>
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 700,
                    mb: 2,
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    color: "primary.main",
                  }}
                >
                  <EditIcon sx={{ fontSize: "1.3rem" }} />
                  Informações Básicas
                </Typography>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 3,
                    backgroundColor: theme.palette.mode === "dark" ? "grey.900" : "grey.50",
                    borderLeft: "4px solid",
                    borderLeftColor: "primary.main",
                  }}
                >
                  <TextField
                    label="Nome do Modelo"
                    placeholder="Ex: Relatório de Vendas, Formulário de Cadastro"
                    {...register("modeloNome")}
                    error={!!errors.modeloNome}
                    helperText={errors.modeloNome?.message}
                    fullWidth
                    size="medium"
                    inputRef={modeloNomeRef}
                  />
                </Paper>
              </Box>

              <Divider sx={{ my: 1 }} />

              {/* Seção 2: Campos Personalizados */}
              <Box>
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      color: "primary.main",
                    }}
                  >
                    <AddIcon sx={{ fontSize: "1.3rem" }} />
                    Campos Personalizados
                  </Typography>
                  <Chip
                    label={`${fields.length} campo${fields.length !== 1 ? "s" : ""}`}
                    color="primary"
                    variant="outlined"
                    size="small"
                  />
                </Box>

                {/* Input para adicionar novo campo */}
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2.5,
                    mb: 3,
                    backgroundColor: theme.palette.mode === "dark" ? "grey.900" : "grey.50",
                    borderLeft: "4px solid",
                    borderLeftColor: "success.main",
                  }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 1.5, color: "text.secondary" }}>
                    Adicionar novo campo
                  </Typography>
                  <Box sx={{ display: "flex", gap: 1.5 }}>
                    <TextField
                      label="Nome do novo campo"
                      value={newFieldName}
                      onChange={(e) => {
                        setNewFieldName(e.target.value);
                        if (newFieldError) setNewFieldError(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addField();
                        }
                      }}
                      error={!!newFieldError}
                      helperText={newFieldError}
                      placeholder="Ex: Nome, Email, Telefone"
                      size="small"
                      fullWidth
                    />
                    <Button
                      variant="contained"
                      onClick={addField}
                      type="button"
                      startIcon={<AddIcon />}
                      sx={{ minWidth: 120, height: 40 }}
                    >
                      Adicionar
                    </Button>
                  </Box>
                </Paper>

                {/* Lista de campos */}
                {fields.length === 0 ? (
                  <Alert severity="info">Nenhum campo adicionado ainda. Comece adicionando um novo campo acima.</Alert>
                ) : (
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
                    {fields
                      .map((field, index) => ({ field, index }))
                      .filter(
                        ({ field }) =>
                          field && typeof field === "object" && field.name !== undefined && field.name !== null
                      )
                      .map(({ field, index }) => (
                        <FieldCard
                          key={field.id}
                          field={field}
                          index={index}
                          errors={errors}
                          register={register}
                          control={control}
                          update={update}
                          remove={remove}
                          theme={theme}
                          watchedFields={watchedFields}
                          isEditing={isEditing}
                          setRemovedFields={setRemovedFields}
                          setError={setError}
                          clearErrors={clearErrors}
                          fieldRefs={fieldRefs}
                          isFreePlan={user?.plano == "free"}
                        />
                      ))}
                  </Box>
                )}
              </Box>

              <Divider sx={{ my: 1 }} />

              {/* Botões de ação */}
              <Box sx={{ display: "flex", gap: 2, mt: 4 }}>
                <Button
                  variant="outlined"
                  onClick={() => navigate("/report-models")}
                  sx={{
                    flex: 1,
                    height: 48,
                    fontWeight: 600,
                    borderColor: "divider",
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  variant="contained"
                  type="submit"
                  sx={{
                    flex: 1,
                    height: 48,
                    fontWeight: 600,
                  }}
                >
                  {isEditing ? "💾 Atualizar Modelo" : "💾 Salvar Modelo"}
                </Button>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* Botão flutuante para rolar para o topo */}
      {showScrollTop && (
        <Tooltip title="Voltar ao topo" placement="left">
          <Box sx={{ position: "fixed", bottom: 30, right: 30, zIndex: 1300 }}>
            <IconButton
              color="primary"
              size="large"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              sx={{
                bgcolor: "primary.main",
                color: "white",
                boxShadow: 3,
                "&:hover": {
                  bgcolor: "primary.dark",
                  transform: "scale(1.1)",
                },
                transition: "all 0.3s ease",
                width: 56,
                height: 56,
              }}
            >
              <ArrowCircleUpIcon fontSize="large" />
            </IconButton>
          </Box>
        </Tooltip>
      )}
    </Box>
  );
}

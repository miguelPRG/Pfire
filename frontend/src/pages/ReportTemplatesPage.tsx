// Importações de bibliotecas e componentes necessários
import { useForm, useFieldArray, Controller } from "react-hook-form"; // Hooks para manipulação de formulários dinâmicos
import { zodResolver } from "@hookform/resolvers/zod"; // Integração do Zod com react-hook-form
import { z } from "zod"; // Validação de esquemas
import { useNavigate } from "react-router-dom"; // Navegação entre páginas
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
} from "@mui/material"; // Componentes de UI do Material UI
import DeleteIcon from "@mui/icons-material/Delete"; // Ícone de deletar
import { useState, useEffect } from "react"; // Hooks do React
import { useAuth } from "../hooks/AuthContext"; // Contexto de autenticação
import { useTheme } from "@mui/material/styles"; // Tema do Material UI
import ArrowCircleUpIcon from "@mui/icons-material/ArrowCircleUp"; // Ícone de scroll para o topo

// Esquema de validação para um campo personalizado
const fieldSchema = z.object({
  name: z.string().min(1, "Nome do campo é obrigatório"),
  datatype: z.string().min(1, "Tipo de dados é obrigatório"),
  required: z.boolean(),
});

// Esquema de validação para o formulário completo
const formSchema = z.object({
  modelName: z.string().min(1, "Nome do modelo é obrigatório"),
  fields: z.array(fieldSchema), 
});

// Tipo TypeScript inferido a partir do esquema do formulário
type FormSchema = z.infer<typeof formSchema>;

/**
 * Página para criação de modelos de relatórios personalizados.
 * Permite adicionar/remover campos dinâmicos, definir tipos e obrigatoriedade,
 * e submeter o modelo para o backend.
 */
export default function ReportTemplatePage() {
  // Hook para navegação entre páginas
  const navigate = useNavigate();

  // Recupera informações da empresa autenticada
  const { empresa } = useAuth();

  // Hook para acessar o tema do Material UI (não utilizado diretamente aqui)
  const theme = useTheme();

  // Estado para controlar o nome do novo campo a ser adicionado
  const [newFieldName, setNewFieldName] = useState("");

  // Estado para exibir ou ocultar o botão de scroll para o topo
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Inicialização do formulário com react-hook-form e validação via Zod
  const {
    register, // Registra campos do formulário
    handleSubmit, // Handler para submissão
    control, // Controle para campos dinâmicos
    formState: { errors }, // Erros de validação
    watch, // Observa valores do formulário (não utilizado aqui)
  } = useForm<FormSchema>({
    resolver: zodResolver(formSchema),
  });

  // Hook para manipular array de campos dinâmicos (adicionar, remover, atualizar)
  const { fields, append, remove, update } = useFieldArray({
    control,
    name: "fields",
  });

  // Efeito para mostrar/esconder o botão de scroll para o topo conforme o scroll da página
  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 100);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  /**
   * Adiciona um novo campo personalizado ao array de campos.
   * Valida se o nome não está vazio e não é duplicado.
   */
  const addField = () => {
    const trimmed = newFieldName.trim();
    if (!trimmed || fields.some((f) => f.name === trimmed)) {
      alert("Nome do campo já existe ou é inválido!");
      return;
    }
    append({ name: trimmed, datatype: "", required: false });
    setNewFieldName("");
  };

  /**
   * Handler para submissão do formulário.
   * - Executa o reCAPTCHA.
   * - Monta o payload para o backend.
   * - Faz a requisição POST para criar o modelo.
   * - Exibe alertas de sucesso ou erro.
   */
  const onSubmit = async (data: FormSchema) => {
    try {
      // Executa o reCAPTCHA Enterprise
      const recaptchaToken = await window.grecaptcha.enterprise.execute("6LdDN-kqAAAAAHYkxo-9PioMLoErWSv1vUvwdig4", {
        action: "register",
      });

      // Monta o objeto de campos personalizados para o backend
      const fields: Record<string, any> = {};
      data.fields.forEach((f) => {
        fields[`custom_${f.name}`] = {
          datatype: f.datatype,
          required: f.required,
        };
      });

      // Monta o payload completo
      const payload = {
        model_name: data.modelName,
        empresa_id: typeof empresa === "object" ? empresa?.id : empresa,
        recaptchaToken,
        ...fields,
      };

      // Envia requisição para o backend
      const res = await fetch("/backend/modelo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.detail || "Erro ao criar modelo");

      alert("Modelo criado com sucesso!");
      navigate("/report-models");
    } catch (err: any) {
      alert(err.message || "Erro ao submeter modelo.");
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
          <Typography variant="h6">Criar Modelo</Typography>

          {/* Campo para nome do modelo */}
          <TextField
            label="Nome do Modelo"
            {...register("modelName")}
            error={!!errors.modelName}
            helperText={errors.modelName?.message}
          />

          <Typography variant="h6">Campos Personalizados</Typography>

          {/* Adição de novo campo personalizado */}
          <Box sx={{ display: "flex", gap: 1 }}>
            <TextField
              label="Nome do novo campo"
              value={newFieldName}
              onChange={(e) => setNewFieldName(e.target.value)}
              fullWidth
            />
            <Button variant="contained" onClick={addField}>
              Adicionar
            </Button>
          </Box>

          {/* Mensagem caso não haja campos adicionados */}
          {fields.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              Nenhum campo adicionado.
            </Typography>
          )}

          {/* Renderização dos campos personalizados adicionados */}
          {fields.map((field, index) => (
            <Box
              key={field.id}
              sx={{ border: "1px solid #ccc", p: 2, borderRadius: 2 }}
            >
              {/* Nome do campo */}
              <TextField
                label="Nome do Campo"
                {...register(`fields.${index}.name`)}
                defaultValue={field.name}
                error={!!errors.fields?.[index]?.name}
                helperText={errors.fields?.[index]?.name?.message}
                fullWidth
                sx={{ mb: 2 }}
              />

              {/* Tipo de dados do campo */}
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Tipo de Dados</InputLabel>
                <Controller
                  control={control}
                  name={`fields.${index}.datatype`}
                  defaultValue={field.datatype}
                  render={({ field }) => (
                    <Select {...field} label="Tipo de Dados">
                      <MenuItem value="string">Texto</MenuItem>
                      <MenuItem value="number">Número</MenuItem>
                      <MenuItem value="bool">Sim/Não</MenuItem>
                      <MenuItem value="date">Data</MenuItem>
                      <MenuItem value="object">Multicampo</MenuItem>
                    </Select>
                  )}
                />
              </FormControl>

              {/* Checkbox para campo obrigatório */}
              <FormControlLabel
                control={<Checkbox {...register(`fields.${index}.required`)} />}
                label="Obrigatório"
              />

              {/* Botão para remover campo */}
              <IconButton
                onClick={() => remove(index)}
                color="error"
                sx={{ mt: 1 }}
              >
                <DeleteIcon />
              </IconButton>
            </Box>
          ))}

          {/* Botões de ação do formulário */}
          <Box sx={{ display: "flex", gap: 2 }}>
            <Button variant="outlined" onClick={() => navigate("/report-models")}>Cancelar</Button>
            <Button variant="contained" type="submit" color="success">Salvar Modelo</Button>
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
          >
            <ArrowCircleUpIcon fontSize="small" />
          </IconButton>
        </Box>
      )}
    </>
  );
}

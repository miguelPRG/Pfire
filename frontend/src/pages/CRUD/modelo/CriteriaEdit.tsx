import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Box,
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  IconButton,
  Breadcrumbs,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import { useState, useLayoutEffect, useEffect } from "react";
import Notification from "../../../components/Notification";
import StyledBreadcrumb from "../../../components/StyledBreadCrumbs";
import HomeIcon from "@mui/icons-material/Home";
import "../../../assets/styles/multiline.css";
import LoadingAnimation from "../../../components/LoadingAnimation";
import { CircularProgress } from "@mui/material";
import ArrowCircleUpIcon from "@mui/icons-material/ArrowCircleUp";
import Tooltip from "@mui/material/Tooltip";
// ---------------------- ZOD SCHEMA ----------------------
// Validação Zod para cada opção: key deve ser uma letra única, value não pode ser vazio
const optionsSchema = z.object({
  key: z.string().regex(/^[A-Za-z]$/, "Coloque 1 letra").length(1),
  value: z.string().min(1, "Valor não pode ser vazio")
});

// Validação Zod para o formulário inteiro
const formSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório").max(100),
  options: z.array(optionsSchema).min(0), // Permite zero ou mais opções
});

type FormType = z.infer<typeof formSchema>;

export default function CreateCriteriaPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const modeloId = location.state?.modeloId;
  const criterioID = location.state?.criterioID;
  const [isloading, setIsloading] = useState(true);

  useLayoutEffect(() => {
    if (!modeloId && !criterioID) {
      navigate("/");
      // recarregar a página
      window.location.reload();

    } else {
      setIsloading(false);
    }
  }, []);

  // ---------------------- useForm ----------------------
  // O useForm gere o estado do formulário e validação dinâmica
  const {
    control,
    register,
    watch,
    handleSubmit,
    formState: { errors },
    trigger, // Permite validar manualmente o formulário sem submeter
    setValue, // Permite marcar campos como "touched" manualmente
  } = useForm<FormType>({
    resolver: zodResolver(formSchema), // Liga o Zod ao react-hook-form
    defaultValues: { options: [] }, // Inicializa o array de opções vazio
    mode: "onSubmit", // Só valida ao submeter ou ao chamar trigger()
  });

  // ---------------------- useFieldArray ----------------------
  // Gere o array dinâmico de campos "options"
  const { fields, append, remove } = useFieldArray({
    control,
    name: "options",
  });

  const [alert, setAlert] = useState<{ message: string; isError: boolean } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 100);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // ---------------------- SUBMIT ----------------------
  // Valida e envia o formulário
  const onSubmit = async (data: FormType) => {
    setSubmitting(true);
    try {
      // Validação extra: obriga pelo menos um critério se o nome estiver preenchido
      if (data.options.length === 0 && watch("nome")?.trim().length != 0) {
        throw new Error("Adicione pelo menos um critério");
      }

      const recaptchaToken = await window.grecaptcha.enterprise.execute("6LdDN-kqAAAAAHYkxo-9PioMLoErWSv1vUvwdig4", {
        action: criterioID ? 'update' : 'register',
      });

      const payload = {
        nome: data.nome,
        modelo_id: modeloId,
        options: data.options,
        recaptcha_token: recaptchaToken,
      };
      
      console.log("Payload to be sent:", payload);
      
      let res;

      if (criterioID) {
        res = await fetch(`/backend/criterio/${criterioID}`, {
          method: "PUT",
          body: JSON.stringify(payload),
          credentials: 'include',
          headers: { "Content-Type": "application/json" }
        });
      } else {
        res = await fetch(`/backend/criterio`, {
          method: "POST",
          body: JSON.stringify(payload),
          credentials: 'include',
          headers: { "Content-Type": "application/json" }
        });
      }

      const result = await res.json();

      if (!res.ok) {

        console.log("Error response from server:", result);

        throw new Error(result.detail || 'Erro ao criar/atualizar critérios');
      }

      setAlert({ message: result.message || 'Critérios criados com sucesso!', isError: false });
      // Navega para a lista de modelos e envia mensagem via state
      navigate("/report-models", {
        state: {
          message: {
            text: result.message || 'Critérios criados com sucesso!',
            error: false,
          },
          reload: true, // se quiser forçar reload
        },
      });
    } catch (err: any) {
      setAlert({ message: err.message || 'Erro ao criar critérios', isError: true });
    } finally {
      setSubmitting(false);
    }
  };

  // ---------------------- TOCAR TODOS OS CAMPOS ----------------------
  // Marca todos os campos como "touched" para garantir que os erros aparecem ao submeter

  if(isloading){
    return <LoadingAnimation />;
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Notification alert={alert} setAlert={setAlert} />
      {/* Breadcrumbs */}
      <Breadcrumbs
        aria-label="breadcrumb"
        sx={{
          mr: "auto",
          mb: 3,
          backgroundColor: "background.paper",
          maxWidth: 320,
          borderRadius: 5,
          p: 0.5,
          boxShadow: 1,
        }}
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
          label="Modelos"
          onClick={() => navigate("/report-models")}
        />
        <StyledBreadcrumb
          component="span"
          sx={{ fontSize: "0.9rem" }}
          label={criterioID ? "Editar Critério" : "Novo Critério"}
        />
      </Breadcrumbs>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h2" sx={{ mb: 2 }}>Editar Critério</Typography>
        <Container
          component="form"
          onSubmit={handleSubmit(onSubmit)}
          sx={{ mt: 2, maxWidth: "900px" }}
        >
          {/* ---------------------- CAMPO NOME ---------------------- */}
          <TextField
            sx={{ mb: 5 }}
            label="Nome do Critério"
            fullWidth
            margin="normal"
            {...register("nome")}
            error={!!errors.nome}
            helperText={errors.nome?.message}
          />

          {/* ---------------------- CAMPOS DINÂMICOS DE OPTIONS ---------------------- */}
          {fields.map((field, index) => (
            <Container key={field.id} sx={{ mb: 5, p: 2, border: '1px solid #ccc', borderRadius: 1, maxWidth: "850px" }}>
              <Typography variant="h3" sx={{ mb: 3 }}>Opção {String.fromCharCode(65 + index)}</Typography>
                <Box sx={{ mb: 2, display: 'flex', flexFlow: "row wrap", gap: 2, alignItems: 'center'}}>
                {/* Campo da chave */}
                <TextField
                  sx={{ display: "none"}}
                  label="Letra"
                  margin="normal"
                  value={String.fromCharCode(65 + index)}
                  disabled
                />
                {/* Campo do valor como TextArea */}
                <TextField
                  sx={{ flexBasis: 500, flexShrink: 1, }}
                  id="outlined-multiline-static"
                  label="Valor"
                  multiline
                  slotProps= {{inputLabel: {className: 'label-multilinha'}}}
                  rows={4}
                  {...register(`options.${index}.value`)}
                  error={!!errors.options?.[index]?.value}
                  helperText={errors.options?.[index]?.value?.message}
                />
                </Box>
              <Box sx={{alignItems: 'center'}}>
                {/* Botão para remover campo */}
                <IconButton 
                  onClick={() => {
                    remove(index); // Remove o campo do array
                    trigger; // Opcional: pode validar após remover, mas não é obrigatório
                  }}
                  sx={{
                    backgroundColor: "error.main",
                    color: "white",
                    "&:hover": { bgcolor: "error.dark" },
                    alignSelf: "center",
                  }}>
                  <DeleteIcon />
                </IconButton>
              </Box>
            </Container>
          ))}

          {/* ---------------------- BOTÃO DE ADICIONAR NOVO CAMPO ---------------------- */}
          <Box sx={{ mb: 2 }}>
            <IconButton
              onClick={async () => {
                if (fields.length >= 26) {
                  setAlert({ message: "Já usou todas as letras do alfabeto!", isError: true });
                  return;
                }
                const valid = await trigger();
                if (valid) {
                  const nextKey = String.fromCharCode(65 + fields.length); // 'A' + índice
                  append({ key: nextKey, value: "" }); // Adiciona com a letra correta
                  const idx = fields.length;
                  setValue(`options.${idx}.key`, nextKey, { shouldTouch: true });
                  setValue(`options.${idx}.value`, "", { shouldTouch: true });
                }
              }}
            >
              <AddIcon />
            </IconButton>
          </Box>

          {/* ---------------------- BOTÕES DE AÇÃO ---------------------- */}
          <Box sx={{ display: "flex", gap: 2, mt: 2 }}>
            <Button
              variant="outlined"
              onClick={() => navigate(-1)}
              sx={{ flex: 1, height: 48, "&:hover": { bgcolor: "grey.300" } }}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="contained"
              color="success"
              sx={{ flex: 1, height: 48 }}
              disabled={submitting}
            >
              {submitting ? <CircularProgress size={28} color="inherit" /> : "Salvar"}
            </Button>
          </Box>
        </Container>
      </Paper>
      {/* ---------------------- BOTÃO VOLTAR AO TOPO ---------------------- */}
      {showScrollTop && (
        <Tooltip title="Ir para o topo" placement="top">
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
    </Container>
  );
}
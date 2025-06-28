import { useAuth } from "../hooks/AuthContext";
import { Box, Button, Container, TextField, Typography, Paper, Grid, Alert } from "@mui/material";
import { useForm, SubmitHandler } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import GlobalPhone from "../components/GlobalPhone";
import { useEffect, useState, useRef } from "react";
import isValidNIF from "./utils/isValidNIF";

// Schemas
const userInfoSchema = z.object({
  name: z.string().nonempty("Nome é obrigatório"),
  telefone: z
    .string({ required_error: "Por favor insira o telefone" })
    .nonempty("Por favor insira o telefone")
    .regex(/^[+]?\d{7,15}$/, "Número de telefone inválido"),
});

const userPasswordSchema = z
  .object({
    password: z.string().nonempty("Senha atual é obrigatória"),
    newPassword: z
      .string()
      .nonempty("A nova senha é obrigatória")
      .min(9, "A nova senha deve ter pelo menos 9 caracteres")
      .regex(/[A-Z]/, "A nova senha deve conter pelo menos uma letra maiúscula")
      .regex(/\d/, "A nova senha deve conter pelo menos um número"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Não coincide com a nova senha",
    path: ["confirmPassword"],
  });

const companySchema = z.object({
  companyName: z.string(),
  nif: z.string()
    .regex(/^[5789]\d{8}$/, "NIF inválido")
    .refine((nif) => isValidNIF(nif), { message: "NIF Inválido" }),
  address: z.string(),
  locality: z.string(),
  postalCode: z.string().regex(/^\d{4}-\d{3}$/, "Formato inválido"),
  companyPhone: z
    .string({ required_error: "Por favor insira o telefone da empresa" })
    .regex(/^[+]?\d{7,15}$/, "Número inválido"),
  logo: z.string().optional(),
});

// Types
type UserInfoFormType = z.infer<typeof userInfoSchema>;
type UserPasswordFormType = z.infer<typeof userPasswordSchema>;
type CompanyFormType = z.infer<typeof companySchema>;

type MessageType = { error: boolean; message: string } | null;

interface SectionFormProps {
  title: string;
  onSubmit: React.FormEventHandler<HTMLFormElement>;
  children: React.ReactNode;
  message?: MessageType;
  setMessage?: React.Dispatch<React.SetStateAction<MessageType>>;
}

// SectionForm tipado
function SectionForm({ title, onSubmit, children }: Omit<SectionFormProps, "message" | "setMessage">) {
  return (
    <Paper elevation={3} sx={{ p: 3, borderRadius: 3, mt: 2, mx: "auto", width: "100%", maxWidth: "700px" }}>
      <Box textAlign="center" mb={3}>
        <Typography variant="h6" fontWeight="bold">
          {title}
        </Typography>
      </Box>
      <Box component="form" onSubmit={onSubmit}>
        {children}
      </Box>
    </Paper>
  );
}

function EditProfilePage() {
  const { user, empresa, updateUser, updatePassword, updateCompany } = useAuth();

  // Estado global para o alerta
  const [globalMessage, setGlobalMessage] = useState<MessageType>(null);

  // Estado para loading dos botões
  const [submitting, setSubmitting] = useState<{
    info: boolean;
    password: boolean;
    company: boolean;
  }>({ info: false, password: false, company: false });

  // Ref para o topo da página
  const topRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const userInfoForm = useForm<UserInfoFormType>({
    resolver: zodResolver(userInfoSchema),
    defaultValues: { name: "", telefone: "" },
    shouldUnregister: true, // Permite limpar os campos ao resetar o formulário
    mode: "onSubmit",
  });
  const userPasswordForm = useForm<UserPasswordFormType>({
    resolver: zodResolver(userPasswordSchema),
    defaultValues: { password: "", newPassword: "", confirmPassword: "" },
    mode: "onSubmit",
  });
  const companyForm = useForm<CompanyFormType>({
    resolver: zodResolver(companySchema),
    defaultValues: { companyName: "", nif: "", address: "", locality: "", postalCode: "", companyPhone: "" },
    mode: "onSubmit",
  });

  useEffect(() => {
    if (user) {
      userInfoForm.reset({ name: user?.nome || "", telefone: user?.telefone || "" });
    }
    if (empresa) {
      companyForm.reset({
        companyName: empresa?.nome || "",
        nif: empresa?.nif || "",
        address: empresa?.morada || "",
        locality: empresa?.localidade || "",
        postalCode: empresa?.codigoPostal || "",
        companyPhone: empresa?.telefone || "",
        logo: empresa?.logo || "", // <-- Adicione esta linha!
      });
    }
  }, [user, empresa]);

  // Scroll suave para o topo quando globalMessage muda
  useEffect(() => {
    if (globalMessage) {
      console.log("Global message changed:", globalMessage);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [globalMessage]);

  const handleSubmitUserUpdate: SubmitHandler<UserInfoFormType> = async (data) => {
    setSubmitting((s) => ({ ...s, info: true }));
    try {
      await updateUser({ nome: data.name, telefone: data.telefone });
      setGlobalMessage({ error: false, message: "Utilizador atualizado com sucesso" });
      // Forçar renderização para garantir que o Alert apareça imediatamente
    } catch (error: any) {
      setGlobalMessage({ error: true, message: error?.message || "Erro ao atualizar dados do usuário" });
      await new Promise((resolve) => setTimeout(resolve, 0));
    } finally {
      setSubmitting((s) => ({ ...s, info: false }));
    }
  };

  const handleSubmitUserPassword: SubmitHandler<UserPasswordFormType> = async (data) => {
    setSubmitting((s) => ({ ...s, password: true }));
    try {
      await updatePassword(data);
      setGlobalMessage({ error: false, message: "Senha atualizada com sucesso" });
      userPasswordForm.reset();
    } catch (error: any) {
      setGlobalMessage({ error: true, message: error?.message || "Erro ao atualizar senha" });
    } finally {
      setSubmitting((s) => ({ ...s, password: false }));
    }
  };

  const handleSubmitCompany: SubmitHandler<CompanyFormType> = async (data) => {
    setSubmitting((s) => ({ ...s, company: true }));
    try {
      await updateCompany(
        {
          nome: data.companyName,
          nif: data.nif,
          morada: data.address,
          localidade: data.locality,
          codigoPostal: data.postalCode,
          telefone: data.companyPhone,
          logo: data.logo,
        },
        empresa?.id || ""
      );
      setGlobalMessage({ error: false, message: "Empresa atualizada" });
    } finally {
      setSubmitting((s) => ({ ...s, company: false }));
    }
  };

  return (
    <Container maxWidth={false} sx={{ mt: 5 }}>
      <div ref={topRef} />
      {globalMessage && (
        <Box mb={3} maxWidth="700px" mx="auto">
          <Alert
            severity={globalMessage.error ? "error" : "success"}
            onClose={() => setGlobalMessage(null)}
            variant="filled"
          >
            {globalMessage.message}
          </Alert>
        </Box>
      )}
      <SectionForm title="Alterar Nome e Telefone" onSubmit={userInfoForm.handleSubmit(handleSubmitUserUpdate)}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12 }}>
            <TextField
              label="Nome"
              fullWidth
              sx={{ width: "100%" }}
              {...userInfoForm.register("name")}
              error={!!userInfoForm.formState.errors.name}
              helperText={userInfoForm.formState.errors.name?.message}
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <GlobalPhone fieldName="telefone" control={userInfoForm.control} errors={userInfoForm.formState.errors} />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <Box display="flex" justifyContent="center" mt={2}>
              <Button
                type="submit"
                variant="contained"
                color="secondary"
                sx={{ width: 200 }}
                disabled={submitting.info}
              >
                Salvar
              </Button>
            </Box>
          </Grid>
        </Grid>
      </SectionForm>
      <SectionForm title="O seu Email" onSubmit={() => {}}>
        <Grid container spacing={2} size={{ xs: 12 }} sx={{ width: "100%" }}>
          <Grid size={{ xs: 12 }}>
            <TextField label="Email" fullWidth sx={{ width: "100%" }} disabled value={user?.email || ""} />
          </Grid>
        </Grid>
      </SectionForm>
      <SectionForm title="Alterar Senha" onSubmit={userPasswordForm.handleSubmit(handleSubmitUserPassword)}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12 }}>
            <TextField
              label="Password"
              type="password"
              fullWidth
              sx={{ width: "100%" }}
              {...userPasswordForm.register("password")}
              error={!!userPasswordForm.formState.errors.password}
              helperText={userPasswordForm.formState.errors.password?.message}
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField
              label="Nova Senha"
              type="password"
              fullWidth
              sx={{ width: "100%" }}
              {...userPasswordForm.register("newPassword")}
              error={!!userPasswordForm.formState.errors.newPassword}
              helperText={userPasswordForm.formState.errors.newPassword?.message}
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField
              label="Confirmar Nova Senha"
              type="password"
              fullWidth
              sx={{ width: "100%" }}
              {...userPasswordForm.register("confirmPassword")}
              error={!!userPasswordForm.formState.errors.confirmPassword}
              helperText={userPasswordForm.formState.errors.confirmPassword?.message}
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <Box display="flex" justifyContent="center" mt={2}>
              <Button
                type="submit"
                variant="contained"
                color="secondary"
                sx={{ width: 200 }}
                disabled={submitting.password}
              >
                Salvar
              </Button>
            </Box>
          </Grid>
        </Grid>
      </SectionForm>
      <SectionForm title="Editar Dados da Empresa" onSubmit={companyForm.handleSubmit(handleSubmitCompany)}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Nome da Empresa"
              fullWidth
              sx={{ width: "100%" }}
              {...companyForm.register("companyName")}
              error={!!companyForm.formState.errors.companyName}
              helperText={companyForm.formState.errors.companyName?.message}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="NIF"
              fullWidth
              sx={{ width: "100%" }}
              {...companyForm.register("nif")}
              error={!!companyForm.formState.errors.nif}
              helperText={companyForm.formState.errors.nif?.message}
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField
              label="Morada"
              fullWidth
              sx={{ width: "100%" }}
              {...companyForm.register("address")}
              error={!!companyForm.formState.errors.address}
              helperText={companyForm.formState.errors.address?.message}
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField
              label="Localidade"
              fullWidth
              sx={{ width: "100%" }}
              {...companyForm.register("locality")}
              error={!!companyForm.formState.errors.locality}
              helperText={companyForm.formState.errors.locality?.message}
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField
              label="Código Postal"
              fullWidth
              sx={{ width: "100%" }}
              {...companyForm.register("postalCode")}
              error={!!companyForm.formState.errors.postalCode}
              helperText={companyForm.formState.errors.postalCode?.message}
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <GlobalPhone fieldName="companyPhone" control={companyForm.control} errors={companyForm.formState.errors} />
          </Grid>
          <Grid size={{ xs: 12 }} sx={{ marginBottom: 20, marginTop: 2 }}>
            <Typography variant="h6" sx={{ textAlign: "center", mb: 5, fontWeight: "bold" }}>
              Logotipo da Empresa
            </Typography>
            <Box display="flex" justifyContent="center" alignItems="center" height={120}>
              <Paper
                elevation={1}
                sx={{
                  width: 250,
                  height: 250,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "0%",
                  bgcolor: "#f5f5f5",
                  color: "#bdbdbd",
                  fontSize: 32,
                  fontWeight: "bold",
                  border: "2px dashed #bdbdbd",
                  overflow: "hidden",
                  position: "relative",
                  cursor: "pointer",
                }}
                onClick={() => fileInputRef.current?.click()}
              >
                {companyForm.watch("logo") || empresa?.logo ? (
                  <img
                    src={`data:image/png;base64,${companyForm.watch("logo") || empresa?.logo}`}
                    alt="Logo da empresa"
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      background: "#f5f5f5",
                    }}
                  />
                ) : (
                  <Box textAlign="center">Insira o logotipo da empresa aqui</Box>
                )}
                <input
                  ref={fileInputRef}
                  accept="image/png, image/jpeg, image/jpg"
                  id="logo-upload"
                  type="file"
                  style={{ display: "none" }}
                  onClick={(e) => e.stopPropagation()}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const maxSize = 1024 * 1024; // Limite de 1MB
                      const allowedTypes = ["image/png", "image/jpeg", "image/jpg"];
                      if (!allowedTypes.includes(file.type)) {
                        alert("Apenas imagens JPG, JPEG ou PNG são permitidas.");
                        return;
                      }
                      if (file.size > maxSize) {
                        alert("O ficheiro é demasiado grande. O limite é 1MB.");
                        return;
                      }
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        companyForm.setValue("logo", (reader.result as string).split(",")[1]);
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
              </Paper>
            </Box>
          </Grid>
          <Grid size={{ xs: 12 }}>
            <Box display="flex" justifyContent="center" mt={2}>
              <Button
                type="submit"
                variant="contained"
                color="secondary"
                sx={{ width: 200 }}
                disabled={submitting.company}
              >
                Salvar
              </Button>
            </Box>
          </Grid>
        </Grid>
      </SectionForm>
    </Container>
  );
}

export default EditProfilePage;

import { useAuth } from "../hooks/AuthContext";
import { Box, Button, Container, TextField, Typography, Paper, Grid, Alert, Fade, IconButton } from "@mui/material";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import GlobalPhone from "../components/GlobalPhone";
import { useState } from "react";
import CloseIcon from "@mui/icons-material/Close";
import { useEffect } from "react";

// Schemas separados
const userInfoSchema = z.object({
  name: z.string(),
  telefone: z.string().regex(/^\+?[0-9\s\-()]{7,15}$/, "Número de telefone inválido"),
});

const userEmailSchema = z.object({
  email: z.string().email("Email inválido"),
});

const userPasswordSchema = z
  .object({
    password: z.string().min(6, "Senha atual é obrigatória"),
    newPassword: z
      .string()
      .min(9, "A senha deve ter pelo menos 9 caracteres")
      .regex(/[A-Z]/, "A senha deve conter pelo menos uma letra maiúscula")
      .regex(/\d/, "A senha deve conter pelo menos um número"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "A confirmação da senha deve ser igual à nova senha",
    path: ["confirmPassword"],
  });

const companySchema = z.object({
  companyName: z.string(),
  nif: z.string().regex(/^[5789]\d{8}$/, "O NIF é inválido"),
  address: z.string(),
  locality: z.string(),
  postalCode: z.string().regex(/^\d{4}-\d{3}$/, "O código postal deve estar no formato 1234-567"),
  companyPhone: z.string().regex(/^\+?[0-9\s\-()]{7,15}$/, "Número de telefone inválido"),
});

type UserInfoInputs = z.infer<typeof userInfoSchema>;
type UserEmailInputs = z.infer<typeof userEmailSchema>;
type UserPasswordInputs = z.infer<typeof userPasswordSchema>;
type CompanyInputs = z.infer<typeof companySchema>;

// Componente da página
function EditProfilePage() {
  const { user, empresa, updateUser } = useAuth();
  const [onSubmitMessage, setOnSubmitMessage] = useState<{ error: boolean; message: string }>({
    error: false,
    message: "",
  });
  const [showAlert, setShowAlert] = useState(false);

  // Mostrar o alert sempre que a mensagem mudar
  useEffect(() => {
    if (onSubmitMessage.message) {
      setShowAlert(true);
    }
  }, [onSubmitMessage]);

  const userInfoForm = useForm<UserInfoInputs>({
    resolver: zodResolver(userInfoSchema),
    defaultValues: {
      name: user?.nome || "",
      telefone: user?.telefone || "",
    },
  });

  const userEmailForm = useForm<UserEmailInputs>({
    resolver: zodResolver(userEmailSchema),
    defaultValues: {
      email: user?.email || "",
    },
  });

  const userPasswordForm = useForm<UserPasswordInputs>({
    resolver: zodResolver(userPasswordSchema),
  });

  const companyForm = useForm<CompanyInputs>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      companyName: empresa?.nome || "",
      nif: empresa?.nif || "",
      address: empresa?.morada || "",
      locality: empresa?.localidade || "",
      postalCode: empresa?.codigoPostal || "",
      companyPhone: empresa?.telefone || "",
    },
  });

  // 🟢 Funções de submissão
  const handleSubmitUserInfo = async (data: UserInfoInputs) => {
    try {
      await updateUser({
        nome: data.name,
        telefone: data.telefone,
      });

      setOnSubmitMessage({
        error: false,
        message: "Informações do usuário atualizadas com sucesso.",
      });
    } catch (error) {
      setOnSubmitMessage({
        error: true,
        message: "Erro ao atualizar informações do usuário.",
      });
    }
  };

  const handleSubmitUserEmail = (data: UserEmailInputs) => {};

  const handleSubmitUserPassword = (data: UserPasswordInputs) => {};

  const handleSubmitCompany = (data: CompanyInputs) => {
    console.log("Empresa atualizada:", data);
  };

  // Componente reutilizável de formulário
  function SectionForm({
    title,
    onSubmit,
    children,
  }: {
    title: string;
    onSubmit: () => void;
    children: React.ReactNode;
  }) {
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

  return (
    <Container maxWidth={false} sx={{ mt: 5 }}>
      {/* ALERTA DE SUBMISSÃO */}
      <Fade in={showAlert}>
        <Box
          sx={{
            position: "fixed",
            top: 24,
            left: 0,
            right: 0,
            zIndex: 1300,
            display: "flex",
            justifyContent: "center",
          }}
        >
          {onSubmitMessage.message && (
            <Alert
              severity={onSubmitMessage.error ? "error" : "success"}
              action={
                <IconButton aria-label="close" color="inherit" size="small" onClick={() => setShowAlert(false)}>
                  <CloseIcon fontSize="inherit" />
                </IconButton>
              }
              sx={{ minWidth: 320, boxShadow: 3 }}
              onClose={() => setShowAlert(false)}
            >
              {onSubmitMessage.message}
            </Alert>
          )}
        </Box>
      </Fade>

      {/* Nome e telefone */}
      <SectionForm title="Alterar Nome e Telefone" onSubmit={userInfoForm.handleSubmit(handleSubmitUserInfo)}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12 }}>
            <TextField
              label="Nome"
              fullWidth
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
              <Button type="submit" variant="contained" color="secondary" sx={{ width: 200 }}>
                Salvar
              </Button>
            </Box>
          </Grid>
        </Grid>
      </SectionForm>

      {/* Email */}
      <SectionForm title="Alterar Email" onSubmit={userEmailForm.handleSubmit(handleSubmitUserEmail)}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12 }}>
            <TextField
              label="Email"
              fullWidth
              {...userEmailForm.register("email")}
              error={!!userEmailForm.formState.errors.email}
              helperText={userEmailForm.formState.errors.email?.message}
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <Box display="flex" justifyContent="center" mt={2}>
              <Button type="submit" variant="contained" color="secondary" sx={{ width: 200 }}>
                Salvar
              </Button>
            </Box>
          </Grid>
        </Grid>
      </SectionForm>

      {/* Senha */}
      <SectionForm title="Alterar Senha" onSubmit={userPasswordForm.handleSubmit(handleSubmitUserPassword)}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12 }}>
            <TextField
              label="Senha Atual"
              type="password"
              fullWidth
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
              {...userPasswordForm.register("confirmPassword")}
              error={!!userPasswordForm.formState.errors.confirmPassword}
              helperText={userPasswordForm.formState.errors.confirmPassword?.message}
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <Box display="flex" justifyContent="center" mt={2}>
              <Button type="submit" variant="contained" color="secondary" sx={{ width: 200 }}>
                Salvar
              </Button>
            </Box>
          </Grid>
        </Grid>
      </SectionForm>

      {/* Empresa */}
      <SectionForm title="Editar Dados da Empresa" onSubmit={companyForm.handleSubmit(handleSubmitCompany)}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Nome da Empresa"
              fullWidth
              {...companyForm.register("companyName")}
              error={!!companyForm.formState.errors.companyName}
              helperText={companyForm.formState.errors.companyName?.message}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="NIF"
              fullWidth
              {...companyForm.register("nif")}
              error={!!companyForm.formState.errors.nif}
              helperText={companyForm.formState.errors.nif?.message}
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField
              label="Morada"
              fullWidth
              {...companyForm.register("address")}
              error={!!companyForm.formState.errors.address}
              helperText={companyForm.formState.errors.address?.message}
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField
              label="Localidade"
              fullWidth
              {...companyForm.register("locality")}
              error={!!companyForm.formState.errors.locality}
              helperText={companyForm.formState.errors.locality?.message}
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField
              label="Código Postal"
              fullWidth
              {...companyForm.register("postalCode")}
              error={!!companyForm.formState.errors.postalCode}
              helperText={companyForm.formState.errors.postalCode?.message}
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <GlobalPhone fieldName="companyPhone" control={companyForm.control} errors={companyForm.formState.errors} />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <Box display="flex" justifyContent="center" mt={2}>
              <Button type="submit" variant="contained" color="secondary" sx={{ width: 200 }}>
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

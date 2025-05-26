import { useEffect, useState } from "react";
import { useAuth } from "../hooks/AuthContext";
import { Box, Button, Container, TextField, Typography, Avatar, Paper, IconButton, Grid } from "@mui/material";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import GlobalPhone from "../components/GlobalPhone";

// Schemas separados
const userSchema = z.object({
  name: z.string().nonempty("O nome é obrigatório"),
  email: z.string().email("Email inválido").nonempty("O email é obrigatório"),
  userPhone: z
    .string()
    .nonempty("O telefone é obrigatório")
    .regex(/^\+?[0-9\s\-()]{7,15}$/, "Número de telefone inválido"),
  password: z.string().optional(),
  newPassword: z.string().optional(),
  confirmPassword: z.string().optional(),
});

const companySchema = z.object({
  companyName: z.string().nonempty("O nome da empresa é obrigatório"),
  nif: z
    .string()
    .nonempty("O NIF é obrigatório")
    .regex(/^[5789]\d{8}$/, "O NIF é inválido"),
  address: z.string().nonempty("A morada é obrigatória"),
  locality: z.string().nonempty("A localidade é obrigatória"),
  postalCode: z
    .string()
    .nonempty("O código postal é obrigatório")
    .regex(/^\d{4}-\d{3}$/, "O código postal deve estar no formato 1234-567"),
  companyPhone: z
    .string()
    .nonempty("O telefone da empresa é obrigatório")
    .regex(/^\+?[0-9\s\-()]{7,15}$/, "Número de telefone inválido"),
});

type UserInputs = z.infer<typeof userSchema>;
type CompanyInputs = z.infer<typeof companySchema>;

function EditProfilePage() {
  const [avatarPreview, setAvatarPreview] = useState("/static/images/avatar/2.jpg");
  const { user, empresa } = useAuth();

  const defaultUserValues = {
    name: user?.nome,
    email: user?.email,
    phone: user?.telefone || "",
  };

  const defaultCompanyValues = {
    companyName: empresa?.nome,
    nif: empresa?.nif,
    address: empresa?.morada,
    locality: empresa?.localidade,
    postalCode: empresa?.codigoPostal,
    companyPhone: empresa?.telefone,
    logo: empresa?.logo || "",
  };

  // Formulário do usuário
  const {
    register: registerUser,
    handleSubmit: handleSubmitUser,
    formState: { errors: userErrors, isSubmitting: isSubmittingUser },
    reset: resetUserForm, // ADICIONE reset
  } = useForm<UserInputs>({
    resolver: zodResolver(userSchema),
    defaultValues: defaultUserValues,
  });

  // Formulário da empresa
  const {
    register: registerCompany,
    handleSubmit: handleSubmitCompany,
    control,
    formState: { errors, isSubmitting },
    reset: resetCompanyForm, // ADICIONE reset
  } = useForm<CompanyInputs>({
    resolver: zodResolver(companySchema),
    defaultValues: defaultCompanyValues,
  });

  // Atualiza formulário do usuário quando user mudar
  useEffect(() => {
    resetUserForm({
      name: user?.nome || "",
      email: user?.email || "",
      userPhone: user?.telefone || "",
    });
  }, [user, resetUserForm]);

  // Atualiza formulário da empresa quando empresa mudar
  useEffect(() => {
    resetCompanyForm({
      companyName: empresa?.nome || "",
      nif: empresa?.nif || "",
      address: empresa?.morada || "",
      locality: empresa?.localidade || "",
      postalCode: empresa?.codigoPostal || "",
      companyPhone: empresa?.telefone || "",
    });
  }, [empresa, resetCompanyForm]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      setAvatarPreview(imageUrl);
    }
  };

  // Submissão dos dados do usuário
  const onSubmitUser = (data: UserInputs) => {
    // Aqui pode adicionar lógica para atualizar perfil e senha
    console.log("Dados do usuário:", data);
  };

  // Submissão dos dados da empresa
  const onSubmitCompany = (data: CompanyInputs) => {
    console.log("Dados da empresa:", data);
  };

  return (
    <Container maxWidth={false} sx={{ mt: 5 }}>
      {/* Formulário de Perfil do Usuário */}
      <Paper
        elevation={3}
        sx={{
          p: 3,
          borderRadius: 3,
          mx: "auto",
          width: "100%",
          maxWidth: "700px",
        }}
      >
        <Box textAlign="center" mb={3} display="flex" flexDirection="column" alignItems="center">
          <Typography variant="h5" fontWeight="bold" mt={2}>
            Editar Perfil
          </Typography>
        </Box>
        <Box component="form" onSubmit={handleSubmitUser(onSubmitUser)}>
          <Grid container spacing={2} justifyContent="center">
            <Grid
              size={{
                xs: 12,
                sm: 6,
              }}
            >
              <TextField
                label="Nome"
                {...registerUser("name")}
                error={!!userErrors.name}
                helperText={userErrors.name?.message}
                fullWidth
              />
            </Grid>
            <Grid
              size={{
                xs: 12,
                sm: 6,
              }}
            >
              <TextField
                label="Email"
                {...registerUser("email")}
                error={!!userErrors.email}
                helperText={userErrors.email?.message}
                fullWidth
              />
            </Grid>
            <Grid
              size={{
                xs: 12,
              }}
            >
              <GlobalPhone fieldName="userPhone" control={control} errors={errors}/>
            </Grid>
            <Grid
              size={{
                xs: 12,
                sm: 6,
              }}
            >
              <TextField label="Senha Atual" type="password" {...registerUser("password")} fullWidth />
            </Grid>
            <Grid
              size={{
                xs: 12,
                sm: 6,
              }}
            >
              <TextField label="Nova Senha" type="password" {...registerUser("newPassword")} fullWidth />
            </Grid>
            <Grid
              size={{
                xs: 12,
              }}
            >
              <TextField label="Confirmar Nova Senha" type="password" {...registerUser("confirmPassword")} fullWidth />
            </Grid>
            <Grid
              size={{
                xs: 12,
              }}
            >
              <Box display="flex" justifyContent="center" mt={2}>
                <Button
                  type="submit"
                  variant="contained"
                  color="secondary"
                  sx={{
                    width: 200,
                  }}
                  disabled={isSubmittingUser}
                >
                  {isSubmittingUser ? "Salvando..." : "Salvar Alterações"}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Box>
      </Paper>

      {/* Formulário de Dados da Empresa */}
      <Paper
        elevation={3}
        sx={{
          p: 3,
          borderRadius: 3,
          mt: 2,
          mx: "auto",
          width: "100%",
          maxWidth: "700px",
        }}
      >
        <Box textAlign="center" mb={3} display="flex" flexDirection="column" alignItems="center">
          <Typography variant="h5" fontWeight="bold" mt={2}>
            Editar Dados da Empresa
          </Typography>
        </Box>
        <Box component="form" onSubmit={handleSubmitCompany(onSubmitCompany)}>
          <Grid container spacing={2} justifyContent="center">
            <Grid
              size={{
                xs: 12,
                sm: 6,
              }}
            >
              <TextField
                {...registerCompany("companyName")}
                label="Nome da Empresa"
                error={!!errors.companyName}
                helperText={errors.companyName?.message}
                fullWidth
              />
            </Grid>
            <Grid
              size={{
                xs: 12,
                sm: 6,
              }}
            >
              <TextField
                {...registerCompany("nif")}
                label="NIF"
                error={!!errors.nif}
                helperText={errors.nif?.message}
                fullWidth
              />
            </Grid>
            <Grid
              size={{
                xs: 12,
                sm: 6,
              }}
            >
              <TextField
                {...registerCompany("address")}
                label="Morada"
                error={!!errors.address}
                helperText={errors.address?.message}
                fullWidth
              />
            </Grid>
            <Grid
              size={{
                xs: 12,
                sm: 6,
              }}
            >
              <TextField
                {...registerCompany("locality")}
                label="Localidade"
                error={!!errors.locality}
                helperText={errors.locality?.message}
                fullWidth
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                {...registerCompany("postalCode")}
                label="Código Postal"
                error={!!errors.postalCode}
                helperText={errors.postalCode?.message}
                fullWidth
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <GlobalPhone fieldName="companyPhone" control={control} errors={errors}/>
            </Grid>
            <Grid
              size={{
                xs: 12,
              }}
            >
              <Box display="flex" justifyContent="center" mt={2}>
                <Button
                  type="submit"
                  variant="contained"
                  color="secondary"
                  sx={{
                    width: 200,
                    boxShadow: 1,
                    "&:hover": {
                      backgroundColor: "secondary.dark",
                    },
                  }}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Salvando..." : "Salvar Alterações"}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Box>
      </Paper>
    </Container>
  );
}

export default EditProfilePage;

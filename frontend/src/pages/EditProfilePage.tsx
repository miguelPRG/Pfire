import { useState, useLayoutEffect } from "react";
import { useAuth } from "../hooks/AuthContext";
import {
  Box,
  Button,
  Container,
  TextField,
  Typography,
  Avatar,
  Paper,
  IconButton,
  Grid,
} from "@mui/material";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import "../assets/styles/phoneNumberField.css";

// Schemas separados
const userSchema = z.object({
  name: z.string().nonempty("O nome é obrigatório"),
  email: z.string().email("Email inválido").nonempty("O email é obrigatório"),
  phone: z
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
  const { user } = useAuth();
  // States para valores padrão do user e da empresa
  const [defaultUserValues, setDefaultUserValues] = useState<UserInputs>({
    name: user?.nome || "", 
    email: user?.email || "",
    phone: user?.telefone || "",
    password: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [defaultCompanyValues, setDefaultCompanyValues] = useState<CompanyInputs>({
    companyName: "",
    nif: "",
    address: "",
    locality: "",
    postalCode: "",
    companyPhone: "",
  });

  useLayoutEffect(() => {

    

  }, []);

  // Formulário do usuário
  const {
    register: registerUser,
    handleSubmit: handleSubmitUser,
    formState: { errors: userErrors, isSubmitting: isSubmittingUser },
  } = useForm<UserInputs>({
    resolver: zodResolver(userSchema),
    defaultValues: defaultUserValues,
  });

  // Formulário da empresa
  const {
    register: registerCompany,
    handleSubmit: handleSubmitCompany,
    control: controlCompany,
    formState: { errors: companyErrors, isSubmitting: isSubmittingCompany },
  } = useForm<CompanyInputs>({
    resolver: zodResolver(companySchema),
    defaultValues: defaultCompanyValues,
  });

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
      <Paper elevation={3} sx={{ p: 3, borderRadius: 3, mx: "auto", width: "100%", maxWidth: "700px" }}>
        <Box textAlign="center" mb={3} display="flex" flexDirection="column" alignItems="center">
          <Box position="relative">
            <Avatar alt="User Avatar" src={avatarPreview} sx={{ width: 80, height: 80 }} />
            <label htmlFor="avatar-upload">
              <input
                accept="image/*"
                id="avatar-upload"
                type="file"
                style={{ display: "none" }}
                onChange={handleFileChange}
              />
              <IconButton
                component="span"
                sx={{
                  position: "absolute",
                  bottom: -5,
                  right: -5,
                  backgroundColor: "secondary.main",
                  boxShadow: 1,
                  "&:hover": { backgroundColor: "secondary.dark" },
                }}
              >
                <PhotoCameraIcon fontSize="small" sx={{ color: (theme) => theme.palette.background.default }} />
              </IconButton>
            </label>
          </Box>
          <Typography variant="h5" fontWeight="bold" mt={2}>
            Editar Perfil
          </Typography>
        </Box>
        <Box component="form" onSubmit={handleSubmitUser(onSubmitUser)}>
          <Grid container spacing={2} justifyContent="center">
            <Grid size={{xs:12, sm: 6}}>
              <TextField
                label="Nome"
                {...registerUser("name")}
                error={!!userErrors.name}
                helperText={userErrors.name?.message}
                fullWidth
              />
            </Grid>
            <Grid size={{xs:12, sm: 6}}>
              <TextField
                label="Email"
                {...registerUser("email")}
                error={!!userErrors.email}
                helperText={userErrors.email?.message}
                fullWidth
              />
            </Grid>
            <Grid size={{xs:12}}>
              <TextField
                label="Telefone"
                {...registerUser("phone")}
                error={!!userErrors.phone}
                helperText={userErrors.phone?.message}
                fullWidth
              />
            </Grid>
            <Grid size={{xs:12, sm: 6}}>
              <TextField
                label="Senha Atual"
                type="password"
                {...registerUser("password")}
                fullWidth
              />
            </Grid>
            <Grid size={{xs:12, sm: 6}}>
              <TextField
                label="Nova Senha"
                type="password"
                {...registerUser("newPassword")}
                fullWidth
              />
            </Grid>
            <Grid size={{xs:12}}>
              <TextField
                label="Confirmar Nova Senha"
                type="password"
                {...registerUser("confirmPassword")}
                fullWidth
              />
            </Grid>
            <Grid size={{xs:12}}>
              <Box display="flex" justifyContent="center" mt={2}>
                <Button
                  type="submit"
                  variant="contained"
                  color="secondary"
                  sx={{ width: 200 }}
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
      <Paper elevation={3} sx={{ p: 3, borderRadius: 3, mt: 2, mx: "auto", width: "100%", maxWidth: "700px" }}>
        <Box textAlign="center" mb={3} display="flex" flexDirection="column" alignItems="center">
          <Typography variant="h5" fontWeight="bold" mt={2}>
            Editar Dados da Empresa
          </Typography>
        </Box>
        <Box component="form" onSubmit={handleSubmitCompany(onSubmitCompany)}>
          <Grid container spacing={2} justifyContent="center">
            <Grid size={{xs:12, sm: 6}}>
              <TextField
                {...registerCompany("companyName")}
                label="Nome da Empresa"
                error={!!companyErrors.companyName}
                helperText={companyErrors.companyName?.message}
                fullWidth
              />
            </Grid>
            <Grid size={{xs:12, sm: 6}}>
              <TextField
                {...registerCompany("nif")}
                label="NIF"
                error={!!companyErrors.nif}
                helperText={companyErrors.nif?.message}
                fullWidth
              />
            </Grid>
            <Grid size={{xs:12, sm: 6}}>
              <TextField
                {...registerCompany("address")}
                label="Morada"
                error={!!companyErrors.address}
                helperText={companyErrors.address?.message}
                fullWidth
              />
            </Grid>
            <Grid size={{xs:12, sm: 6}}>
              <TextField
                {...registerCompany("locality")}
                label="Localidade"
                error={!!companyErrors.locality}
                helperText={companyErrors.locality?.message}
                fullWidth
              />
            </Grid>
            <Grid size={{xs:12, sm: 6}}>
              <TextField
                {...registerCompany("postalCode")}
                label="Código Postal"
                error={!!companyErrors.postalCode}
                helperText={companyErrors.postalCode?.message}
                fullWidth
              />
            </Grid>
            <Grid size={{xs:12}}>
              <Controller
                name="companyPhone"
                control={controlCompany}
                render={({ field }) => (
                  <Box>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        border: "1px solid",
                        borderColor: companyErrors.companyPhone
                          ? "error.main"
                          : "rgba(0, 0, 0, 0.23)",
                        borderRadius: 1,
                        padding: "18.5px 14px",
                        fontSize: "16px",
                        "&:hover": { borderColor: "black" },
                        "&:focus-within": { borderColor: "primary.main", borderWidth: 2 },
                      }}
                    >
                      <PhoneInput
                        {...field}
                        defaultCountry="PT"
                        international
                        countryCallingCodeEditable={false}
                        placeholder="Insira o número de telefone"
                        style={{
                          fontSize: "16px",
                          border: "none",
                          outline: "none",
                          width: "100%",
                          background: "transparent",
                        }}
                      />
                    </Box>
                    {companyErrors.companyPhone && (
                      <Typography color="error" variant="body2" sx={{ mt: 0.5 }}>
                        {companyErrors.companyPhone.message}
                      </Typography>
                    )}
                  </Box>
                )}
              />
            </Grid>
            <Grid size={{xs:12}}>
              <Box display="flex" justifyContent="center" mt={2}>
                <Button
                  type="submit"
                  variant="contained"
                  color="secondary"
                  sx={{ width: 200, boxShadow: 1, "&:hover": { backgroundColor: "secondary.dark" } }}
                  disabled={isSubmittingCompany}
                >
                  {isSubmittingCompany ? "Salvando..." : "Salvar Alterações"}
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

import { useState } from "react";
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
// Esquema de validação com Zod
const editProfileSchema = z.object({
  userName: z.string().nonempty("O nome do usuário é obrigatório"),
  userEmail: z.string().email("O email é inválido").nonempty("O email é obrigatório"),
  userPhone: z
    .string()
    .nonempty("O telefone do usuário é obrigatório")
    .regex(/^\+?[0-9\s\-()]{7,15}$/, "Número de telefone inválido"),
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

type EditCompanyFormInputs = z.infer<typeof editProfileSchema>;

function EditProfilePage() {
  const [formData, setFormData] = useState({
    name: "João Silva",
    email: "joao@email.com",
    phone: "+351 912 345 678",
    password: "",
    confirmPassword: "",
    newPassword: "",
  });

  const [avatarPreview, setAvatarPreview] = useState(
    "/static/images/avatar/2.jpg",
  );

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<EditCompanyFormInputs>({
    resolver: zodResolver(editProfileSchema),
    defaultValues: {
      userName: "João Silva",
      userEmail: "joao@email.com",
      userPhone: "+351 912 345 678",
      companyName: "João Silva",
      nif: "",
      address: "",
      locality: "",
      postalCode: "",
      companyPhone: "",
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      setAvatarPreview(imageUrl);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmitInfo = async (data: EditCompanyFormInputs) => {
    console.log("Dados atualizados:", data);
  };

  const handleSubmitPassword = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Nova senha:", formData.password);
  };

  return (
    <Container maxWidth={false} sx={{ mt: 5 }}>
      {/* Formulário de Perfil */}
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
        <Box
          textAlign="center"
          mb={3}
          display="flex"
          flexDirection="column"
          alignItems="center"
        >
          <Box position="relative">
            <Avatar
              alt="User Avatar"
              src={avatarPreview}
              sx={{ width: 80, height: 80 }}
            />
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
                  "&:hover": {
                    backgroundColor: "secondary.dark", // Cor ao passar o mouse
                  },
                }}
              >
                <PhotoCameraIcon
                  fontSize="small"
                  sx={{
                    color: (theme) => theme.palette.background.default, // Acessa a cor do tema dinamicamente
                  }}
                />
              </IconButton>
            </label>
          </Box>

          <Typography variant="h5" fontWeight="bold" mt={2}>
            Editar Perfil
          </Typography>
        </Box>

        <Box component="form" onSubmit={handleSubmitPassword}>
          <Grid container spacing={2} justifyContent="center">
            <Grid item xs={12} md={6}>
              <TextField
                label="Nome"
                name="name"
                value={formData.name}
                onChange={handleChange}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Telefone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                fullWidth
              />
            </Grid>

            <Grid item xs={12}>
              <Box display="flex" justifyContent="center" mt={2}>
                <Button
                  type="submit"
                  variant="contained"
                  color="secondary"
                  sx={{ width: 200 }}
                >
                  Salvar Alterações
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Box>
      </Paper>

      {/* Formulário de Senha */}
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
        <Typography variant="h5" fontWeight="bold" textAlign="center" mb={3}>
          Alterar Senha
        </Typography>

        <Box component="form" onSubmit={handleSubmitPassword}>
          <Grid container spacing={2} justifyContent="center">
            <Grid item xs={12} md={6}>
              <TextField
                label="Senha Atual"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                fullWidth
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                label="Nova Senha"
                name="newPassword"
                type="password"
                value={formData.newPassword}
                onChange={handleChange}
                fullWidth
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                label="Confirmar Nova Senha"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleChange}
                fullWidth
              />
            </Grid>

            <Grid item xs={12}>
              <Box display="flex" justifyContent="center" mt={2}>
                <Button
                  type="submit"
                  variant="contained"
                  color="secondary"
                  sx={{ width: 200 }}
                >
                  Alterar Senha
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
        <Box
          textAlign="center"
          mb={3}
          display="flex"
          flexDirection="column"
          alignItems="center"
        >
          <Typography variant="h5" fontWeight="bold" mt={2}>
            Editar Dados da Empresa
          </Typography>
        </Box>
        <Box component="form" onSubmit={handleSubmit(handleSubmitInfo)}>
          <Grid container spacing={2} justifyContent="center">
            {/* Campos do Usuário */}
            <Grid item xs={12} md={6}>
              <TextField
                {...register("userName")}
                label="Nome do Usuário"
                error={!!errors.userName}
                helperText={errors.userName?.message}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                {...register("userEmail")}
                label="Email do Usuário"
                error={!!errors.userEmail}
                helperText={errors.userEmail?.message}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                {...register("userPhone")}
                label="Telefone do Usuário"
                error={!!errors.userPhone}
                helperText={errors.userPhone?.message}
                fullWidth
              />
            </Grid>

            {/* Campos da Empresa */}
            <Grid item xs={12} md={6}>
              <TextField
                {...register("companyName")}
                label="Nome da Empresa"
                error={!!errors.companyName}
                helperText={errors.companyName?.message}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                {...register("nif")}
                label="NIF"
                error={!!errors.nif}
                helperText={errors.nif?.message}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                {...register("address")}
                label="Morada"
                error={!!errors.address}
                helperText={errors.address?.message}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                {...register("locality")}
                label="Localidade"
                error={!!errors.locality}
                helperText={errors.locality?.message}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                {...register("postalCode")}
                label="Código Postal"
                error={!!errors.postalCode}
                helperText={errors.postalCode?.message}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <div id="telefone-field">
                <Controller
                  name="companyPhone"
                  control={control}
                  render={({ field }) => (
                    <Box>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          border: "1px solid",
                          borderColor: errors.companyPhone
                            ? "error.main"
                            : "rgba(0, 0, 0, 0.23)",
                          borderRadius: 1,
                          padding: "18.5px 14px",
                          fontSize: "16px",
                          "&:hover": {
                            borderColor: "black",
                          },
                          "&:focus-within": {
                            borderColor: "primary.main",
                            borderWidth: 2,
                          },
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
                      {errors.companyPhone && (
                        <Typography
                          color="error"
                          variant="body2"
                          sx={{ mt: 0.5 }}
                        >
                          {errors.companyPhone.message}
                        </Typography>
                      )}
                    </Box>
                  )}
                />
              </div>
            </Grid>
            <Grid item xs={12}>
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

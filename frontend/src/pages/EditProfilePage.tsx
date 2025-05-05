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
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

// Esquema de validação com Zod
const editCompanySchema = z.object({
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
    .regex(/^\d{9}$/, "O telefone da empresa deve ter 9 dígitos"),
});

type EditCompanyFormInputs = z.infer<typeof editCompanySchema>;

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
    formState: { errors, isSubmitting },
  } = useForm<EditCompanyFormInputs>({
    resolver: zodResolver(editCompanySchema),
    defaultValues: {
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
              <TextField
                {...register("companyPhone")}
                label="Telefone empresa"
                error={!!errors.companyPhone}
                helperText={errors.companyPhone?.message}
                fullWidth
              />
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

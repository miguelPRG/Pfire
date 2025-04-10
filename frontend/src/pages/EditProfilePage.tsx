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

function EditProfilePage() {
  const [formData, setFormData] = useState({
    name: "João Silva",
    email: "joao@email.com",
    phone: "+351 912 345 678",
    password: "",
    confirmPassword: "",
    newPassword: "",
    companyName: "",
    nif: "",
    address: "",
    locality: "",
    postalCode: "",
    companyPhone: "",
  });

  const [avatarPreview, setAvatarPreview] = useState(
    "/static/images/avatar/2.jpg",
  );

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

  const handleSubmitInfo = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Dados atualizados:", formData);
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

        <Box component="form" onSubmit={handleSubmitInfo}>
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
            Editar Dados da Empresa
          </Typography>
        </Box>
        <Box component="form" onSubmit={handleSubmitInfo}>
          <Grid container spacing={2} justifyContent="center">
            <Grid item xs={12} md={6}>
              <TextField
                label="Nome da Empresa"
                name="companyName"
                value={formData.companyName}
                onChange={handleChange}
                fullWidth
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                label="NIF"
                name="nif"
                value={formData.nif}
                onChange={handleChange}
                fullWidth
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                label="Morada"
                name="address"
                value={formData.address}
                onChange={handleChange}
                fullWidth
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                label="Localidade"
                name="locality"
                value={formData.locality}
                onChange={handleChange}
                fullWidth
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                label="Código Postal"
                name="postalCode"
                value={formData.postalCode}
                onChange={handleChange}
                fullWidth
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                label="Telefone empresa"
                name="companyPhone"
                value={formData.companyPhone}
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
                  sx={{ width: 200 ,boxShadow: 1,
                    "&:hover": {
        backgroundColor: "secondary.dark", // Cor ao passar o mouse
      },}}
                >
                  Salvar Alterações
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

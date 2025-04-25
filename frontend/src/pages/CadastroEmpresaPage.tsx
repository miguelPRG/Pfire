import {
  Container,
  Typography,
  Paper,
  TextField,
  Button,
  Box,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { useRef } from "react";

import logo from "../assets/images/logo.png";

function CadastroEmpresaPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const nomeEmpresaRef = useRef<HTMLInputElement>(null);
  const nifRef = useRef<HTMLInputElement>(null);
  const localidadeRef = useRef<HTMLInputElement>(null);
  const moradaRef = useRef<HTMLInputElement>(null);
  const codigoPostalRef = useRef<HTMLInputElement>(null);

  return (
    <Container
      maxWidth="sm"
      sx={{
        textAlign: "center",
        mt: 4,
        padding: 4,
        borderRadius: 2,
      }}
    >
      {/* Logo e nome da aplicação no topo */}
      <Box
        sx={{
          position: "relative",
          marginBottom: 7,
        }}
      >
        <Box
          sx={{
            backgroundColor: "primary.main",
            borderRadius: "50%",
            width: 70,
            height: 70,
            position: "absolute",
            top: "10px",
            zIndex: 1,
          }}
        >
          <img
            src={logo}
            alt="Logo"
            style={{
              width: "100px",
              height: "100px",
            }}
          />
        </Box>
      </Box>

      <Paper
        elevation={6}
        sx={{
          maxWidth: "1000px",
        }}
      >
        <Typography
          variant="h1"
          sx={{
            marginBottom: 2,
            marginTop: 2.5,
          }}
        >
          CRIAR CONTA
        </Typography>

        <form>
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 0,
              "& > *": {
                marginBottom: "-15px", // Ajuste fino no espaçamento negativo
              },
            }}
          >
            {/* Dados da Empresa */}
            <Typography
              variant="h5"
              sx={{
                marginTop: 0,
                marginBottom: 0,
                lineHeight: 1.2,
              }}
            >
              Insira os dados da Empresa
            </Typography>

            {isMobile ? (
              <TextField
                required
                id="nome"
                label="Nome da empresa"
                type="text"
                inputRef={nomeEmpresaRef}
                sx={{ mb: 0.5 }}
              />
            ) : (
              <Box sx={{ display: "flex", gap: 1, width: "100%" }}>
                <TextField
                  required
                  id="nome"
                  label="Nome da empresa"
                  type="text"
                  inputRef={nomeEmpresaRef}
                  sx={{ flexGrow: 1 }}
                />
              </Box>
            )}

            {isMobile ? (
              <>
                <TextField
                  required
                  id="nif"
                  label="NIF da empresa"
                  type="text"
                  inputRef={nifRef}
                  sx={{ mb: 0.5 }}
                />
                <TextField
                  required
                  id="localidade"
                  label="Localidade"
                  type="text"
                  sx={{ mb: 0.5 }}
                />
              </>
            ) : (
              <Box sx={{ display: "flex", gap: 2, width: "100%" }}>
                <TextField
                  required
                  id="nif"
                  label="NIF da empresa"
                  type="text"
                  inputRef={nifRef}
                  sx={{ flexGrow: 1 }}
                />
                <TextField
                  required
                  id="localidade"
                  label="Localidade"
                  type="text"
                  inputRef={localidadeRef}
                  sx={{ flexGrow: 1 }}
                />
              </Box>
            )}

            {isMobile ? (
              <>
                <TextField
                  required
                  id="morada"
                  label="Morada"
                  type="text"
                  inputRef={moradaRef}
                  sx={{ mb: 0.5 }}
                />
                <TextField
                  required
                  id="codigo_postal"
                  label="Código postal"
                  type="text"
                  inputRef={codigoPostalRef}
                  sx={{ mb: 0.5 }}
                />
              </>
            ) : (
              <Box sx={{ display: "flex", gap: 1, width: "100%" }}>
                <TextField
                  required
                  id="morada"
                  label="Morada"
                  type="text"
                  inputRef={moradaRef}
                  sx={{ flexGrow: 1 }}
                />
                <TextField
                  required
                  id="codigo_postal"
                  label="Código postal"
                  type="text"
                  inputRef={codigoPostalRef}
                  sx={{ flexGrow: 1 }}
                />
              </Box>
            )}

            {/* Botão de Criar Conta */}
            <Button
              type="submit"
              sx={{
                background: "linear-gradient(45deg, #FFA726 30%, #FB8C00 90%)",
                color: "white",
                fontWeight: "bold",
                marginTop: 2,
                transition: "0.3s",
                "&:hover": {
                  background:
                    "linear-gradient(45deg, #FB8C00 30%, #FFA726 90%)",
                },
              }}
            >
              FINALIZAR CADASTO
            </Button>
          </Box>
        </form>
      </Paper>
    </Container>
  );
}

export default CadastroEmpresaPage;

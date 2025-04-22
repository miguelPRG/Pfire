import { Box, Button, TextField, Typography, Paper } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@mui/material/styles";
import { useRef } from "react";

declare var grecaptcha: any; 
export default function AddNewClientPage() {
  const navigate = useNavigate();
  const theme = useTheme();

  // Refs para os campos
  const nomeRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const telefoneRef = useRef<HTMLInputElement>(null);
  const nifRef = useRef<HTMLInputElement>(null);
  const localidadeRef = useRef<HTMLInputElement>(null);
  const moradaRef = useRef<HTMLInputElement>(null);
  const codigoPostalRef = useRef<HTMLInputElement>(null);

  const enviarNovoCliente = async (dados: any) => {
    try {
      if (!dados.empresa_id || !/^[a-f\d]{24}$/i.test(dados.empresa_id)) {
        throw new Error("ID da empresa inválido ou não fornecido.");
      }

      const recaptchaToken = await grecaptcha.enterprise.execute(
        "6LdDN-kqAAAAAHYkxo-9PioMLoErWSv1vUvwdig4",
        { action: "register" }
      );

      const response = await fetch(`/backend/cliente?recaptchaToken=${recaptchaToken}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(dados),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Erro ao criar cliente");
      }

      console.log("Cliente criado com sucesso:", data);
    } catch (error) {
      console.error("Erro ao criar cliente:", error);
      throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const empresa_id = prompt("Insere o ID da empresa:");
    if (!empresa_id) {
      alert("Erro: empresa_id não fornecido.");
      return;
    }

    const novoCliente = {
      nome: nomeRef.current?.value || "",
      email: emailRef.current?.value || "",
      telefone: telefoneRef.current?.value || "",
      nif: nifRef.current?.value || "",
      localidade: localidadeRef.current?.value || "",
      morada: moradaRef.current?.value || "",
      codigo_postal: codigoPostalRef.current?.value || "",
      empresa_id: empresa_id,
    };

    try {
      await enviarNovoCliente(novoCliente);
      alert("Novo cliente adicionado com sucesso!");
      navigate("/ClientManagementTable");
    } catch (error) {
      alert("Erro ao adicionar cliente.");
    }
  };

  const handleCancel = () => {
    navigate("/ClientManagementTable");
  };

  return (
    <Paper sx={{ maxWidth: 600, mx: "auto", mt: 5, p: 4 }}>
      <Typography
        variant="h5"
        sx={{ fontWeight: "bold", fontSize: 30, textAlign: "center" }}
      >
        Adicionar novo Cliente
      </Typography>

      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{ display: "flex", flexDirection: "column", gap: 2 }}
      >
        <TextField label="Nome" inputRef={nomeRef} required fullWidth />
        <TextField label="Email" type="email" inputRef={emailRef} required fullWidth />
        <TextField label="Telefone" inputRef={telefoneRef} required fullWidth />
        <TextField label="NIF" inputRef={nifRef} required fullWidth />
        <TextField label="Localidade" inputRef={localidadeRef} fullWidth />
        <TextField label="Morada" inputRef={moradaRef} fullWidth />
        <TextField label="Código Postal" inputRef={codigoPostalRef} fullWidth />

        <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2, mt: 2 }}>
          <Button onClick={handleCancel} sx={{
            backgroundColor: theme.palette.primary.main,
            color: "white",
            minWidth: 140,
          }}>
            Cancelar
          </Button>
          <Button type="submit" variant="contained" sx={{
            backgroundColor: theme.palette.success.main,
            color: "white",
            "&:hover": { backgroundColor: theme.palette.success.dark },
            minWidth: 140,
          }}>
            Adicionar
          </Button>
        </Box>
      </Box>
    </Paper>
  );
}

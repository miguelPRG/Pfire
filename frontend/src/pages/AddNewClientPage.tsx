import React from "react";
import { Box, Button, TextField, Typography, Paper } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@mui/material/styles";

export default function AddNewClientPage() {
  const navigate = useNavigate();
  const theme = useTheme();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert("Novo cliente adicionado!");
    navigate("/ClientManagementTable");
  };

  const handleCancel = () => {
    navigate("/ClientManagementTable");
  };

  return (
    <Paper sx={{ maxWidth: 600, mx: "auto", mt: 5, p: 4 }}>
      <Typography variant="h5" sx={{ fontWeight: "bold" ,fontSize:30,textAlign:"center"}}>Adicionar novo Cliente</Typography>
             
      <Box component="form" onSubmit={handleSubmit} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <TextField label="Nome" required fullWidth />
        <TextField label="Email" type="email" required fullWidth />
        <TextField label="Telefone" required fullWidth />
        <TextField label="NIF" required fullWidth />
        <TextField label="Cidade" fullWidth />
        <TextField label="Morada" fullWidth />
        <TextField label="Código Postal" fullWidth />
        <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2, mt: 2 }}>
          <Button onClick={handleCancel} sx={{ backgroundColor: theme.palette.mode === "dark" ? theme.palette.primary.main : theme.palette.primary.main, color: "white" ,minWidth: 140}}>
            Cancelar
          </Button>
          <Button type="submit" variant="contained" sx={{ backgroundColor: theme.palette.success.main, color: "white", '&:hover': { backgroundColor: theme.palette.success.dark } , minWidth: 140 }}>
            Adicionar
          </Button>
        </Box>
      </Box>
    </Paper>
  );
}

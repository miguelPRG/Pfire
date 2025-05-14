import { useAuth } from "../hooks/AuthContext";
import { Paper, Typography, Button, Container } from "@mui/material";

function HomePage() {
  const { user, logout } = useAuth();

  return (
    <Container maxWidth="lg">
      <Paper elevation={3}>
        <Typography variant="h4">Bem-vindo, {user?.nome}!</Typography>
        <Button color="primary" onClick={logout}>
          Logout
        </Button>
      </Paper>
    </Container>
  );
}

export default HomePage;

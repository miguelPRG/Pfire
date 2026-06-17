import { Container, Typography, Paper, TextField, Button, Box } from "@mui/material";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import logo from "../../assets/images/logo.png";

// Esquema de validação com Zod
const empresaSchema = z.object({
  nome: z.string().nonempty("O nome da empresa é obrigatório"),
  nif: z
    .string()
    .nonempty("O NIF é obrigatório")
    .regex(/^[5789]\d{8}$/, "O NIF é inválido"),
  localidade: z.string().nonempty("A localidade é obrigatória").trim(),
  morada: z.string().nonempty("A morada é obrigatória").trim(),
  codigo_postal: z
    .string()
    .nonempty("O código postal é obrigatório")
    .regex(/^\d{4}-\d{3}$/, "O código postal deve estar no formato 1234-567")
    .trim(),
});

type EmpresaFormInputs = z.infer<typeof empresaSchema>;

function CadastroEmpresaPage() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EmpresaFormInputs>({
    resolver: zodResolver(empresaSchema),
  });

  const onSubmit = async (data: EmpresaFormInputs) => {
    console.log("Dados da empresa:", data);
    // Aqui você pode enviar os dados para o backend
  };

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

        <form onSubmit={handleSubmit(onSubmit)}>
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 2,
            }}
          >
            {/* Dados da Empresa */}
            <Typography
              variant="h4"
              sx={{
                marginTop: 0,
                marginBottom: 0,
                lineHeight: 1.2,
              }}
            >
              Insira os dados da Empresa
            </Typography>

            <TextField
              {...register("nome")}
              label="Nome da empresa*"
              error={!!errors.nome}
              helperText={errors.nome?.message}
              fullWidth
              margin="normal"
            />
            <TextField
              {...register("nif")}
              label="NIF da empresa*"
              error={!!errors.nif}
              helperText={errors.nif?.message}
              fullWidth
              margin="normal"
            />
            <TextField
              {...register("localidade")}
              label="Localidade*"
              error={!!errors.localidade}
              helperText={errors.localidade?.message}
              fullWidth
              margin="normal"
            />
            <TextField
              {...register("morada")}
              label="Morada*"
              error={!!errors.morada}
              helperText={errors.morada?.message}
              fullWidth
              margin="normal"
            />
            <TextField
              {...register("codigo_postal")}
              label="Código postal*"
              error={!!errors.codigo_postal}
              helperText={errors.codigo_postal?.message}
              fullWidth
              margin="normal"
            />

            {/* Botão de Criar Conta */}
            <Button
              type="submit"
              disabled={isSubmitting}
              sx={{
                background: "linear-gradient(45deg, #FFA726 30%, #FB8C00 90%)",
                color: "white",
                fontWeight: "bold",
                marginTop: 2,
                transition: "0.3s",
                "&:hover": {
                  background: "linear-gradient(45deg, #FB8C00 30%, #FFA726 90%)",
                },
              }}
            >
              {isSubmitting ? "A criar..." : "FINALIZAR CADASTRO"}
            </Button>
          </Box>
        </form>
      </Paper>
    </Container>
  );
}

export default CadastroEmpresaPage;

import { Components } from "@mui/material/styles";

const commonComponents: Components = {
  MuiCssBaseline: {
    styleOverrides: {
      body: {
        margin: "0", // 🔹 Remove margem global
        padding: "0", // 🔹 Remove padding global
        border: "none", // 🔹 Remove qualquer borda global
        boxShadow: "none", // 🔹 Remove sombras que possam criar efeito de borda
        "& .MuiBox-root": {
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        },
      },
    },
  },

  MuiContainer: {
    styleOverrides: {
      root: {
        padding: "10px",
        border: "0",
      },
    },
  },

  MuiOutlinedInput: {
    styleOverrides: {
      root: {
        backgroundColor: "#FFFFFF",
        borderRadius: "10px",
        width: "100%",
      },
    },
  },
  MuiButton: {
    defaultProps: {
      variant: "contained",
      disableRipple: true,
      disableElevation: true,
      fullWidth: true,
    },
    styleOverrides: {
      root: {
        textTransform: "none",
        borderRadius: "10px",
        padding: "10px 20px",
        fontWeight: "bold",
        transition: "0.3s",
        marginBottom: "10px",
        "&:hover": {
          backgroundColor: "#1565C0",
        },
      },
    },
  },
  MuiPaper: {
    styleOverrides: {
      root: {
        backgroundColor: "primary",
        backgroundImage: "none",
        borderRadius: "15px", // 🔹 Remove qualquer borda arredondada da página
        padding: "14px",
        width: "100%",
        margin: "auto",
        marginBottom: "10px",
        boxShadow: "none", // 🔹 Remove qualquer sombra desnecessária
      },
    },
  },
  MuiTextField: {
    defaultProps: {
      margin: "normal",
      fullWidth: true,
      variant: "filled",
    },
    styleOverrides: {
      root: {
        marginBottom: "10px",
        "&:hover .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline": {
          borderColor: "#1976D2",
        },
        width: "100%",
        "& .MuiInputBase-root": { height: 50 }, // Ajusta altura do campo
        "& .MuiInputLabel-root": { top: -5 }, // Move o label para cima
        "& .MuiInputLabel-shrink": { top: 0 }, // Ajusta label quando o usuário digita
      },
    },
  },
  MuiTypography: {
    styleOverrides: {
      h1: {
        fontSize: "1.3rem",
        fontWeight: "550",
      },
      root: {
        fontSize: "1rem",
      },
    },
  },
  MuiIconButton: {
    styleOverrides: {
      root: {
        backgroundColor: "primary.main",
        color: "white",
        boxShadow: "0px 3px 6px rgba(0, 0, 0, 0.2)",
      },
    },
  },
};

export default commonComponents;

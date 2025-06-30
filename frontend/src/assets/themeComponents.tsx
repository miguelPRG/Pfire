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

      span: {
        display: "inline", // 🔹 Garante que o span se comporte como um bloco inline
      }
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
        padding: "10px",
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
        "& .MuiInputLabel-root": {
          lineHeight: "1.2", // Aumenta a altura do label
          fontSize: "1.1rem", //
        },
        "& .MuiInputLabel-shrink": { top: 0 },
      },
    },
  },
  MuiInputLabel: {
    styleOverrides: {
      root: ({ theme }: any) => ({
        color: theme.palette.text.primary,
        "&.Mui-focused": {
          color: theme.palette.primary.main,
        },
        "&.Mui-error": {
          color: theme.palette.text.primary,
        },
      }),
    },
  },
  MuiTypography: {
    styleOverrides: {
      h1: {
        fontSize: "1.7rem",
        fontWeight: "bold",
      },

      h2: {
        fontSize: "1.5rem",
        fontWeight: "bold",
      },

      h3: {
        fontSize: "1.2rem",
        fontWeight: "bold",
      },

      body1: {
        fontSize: "1rem",
        "& a": {
          color: "#1976D2", // Define a cor dos links
          textDecoration: "none", // Remove o sublinhado
          "&:hover": {
            textDecoration: "underline", // Adiciona sublinhado ao passar o mouse
          },
          "&:active": {
            color: "#1976D2", // Define a cor ao clicar
          },
        },
        width: "100%",
      },
      body2: {
        width: "100%",
      }
    },
  },
  MuiIconButton: {
    styleOverrides: {
      root: {
        backgroundColor: "#1976D2",
        color: "white",
        boxShadow: "0px 3px 6px rgba(0, 0, 0, 0.2)",

        "&:hover": {
          backgroundColor: "#00C8FF",
        },
      },
    },
  },
};

export default commonComponents;

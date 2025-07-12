import { TextField, TextFieldProps, InputAdornment, IconButton } from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import { useState } from "react";
import { useTema } from "../hooks/TemaContext";

type PasswordFieldProps = TextFieldProps;

export default function PasswordField(props: PasswordFieldProps) {
  const [show, setShow] = useState(false);
  const theme = useTema();

  return (
    <TextField
      {...props}
      type={show ? "text" : "password"}
      // Migração para slotProps
      slotProps={{
        input: {
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                sx={{
                  color: theme.darkMode ? "white" : "black",
                  backgroundColor: theme.darkMode ? "#3A3A3A" : "#F0F0F0",
                  ":hover": {
                    backgroundColor: theme.darkMode ? "#F0F0F0" : "#3A3A3A",
                    color: theme.darkMode ? "black" : "white",
                  },
                }}
                aria-label="Mostrar/ocultar senha"
                onClick={() => setShow((s) => !s)}
                edge="end"
                size="small"
              >
                {show ? <VisibilityOff /> : <Visibility />}
              </IconButton>
            </InputAdornment>
          ),
        },
      }}
    />
  );
}

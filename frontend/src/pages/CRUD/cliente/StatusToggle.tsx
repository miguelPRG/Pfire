// src/pages/CRUD/cliente/StatusToggle.tsx
import { Button, CircularProgress, useTheme } from "@mui/material";
import React from "react";

type StatusToggleProps = {
  active?: boolean;
  loading?: boolean;
  onToggle: () => void | Promise<void>;
  size?: "small" | "medium" | "large";
};

export default function StatusToggle({
  active,
  loading,
  onToggle,
  size = "medium",
}: StatusToggleProps) {
  const theme = useTheme();

  return (
    <Button
      variant="contained"
      size={size}
      sx={{
        width: 55,
        height: 55,
        borderRadius: "50%",
        backgroundColor: active ? theme.palette.success.main : theme.palette.error.main,
        color: "#fff",
        fontWeight: "bold",
        fontSize: 15,
        minWidth: 0,
        px: 0,
        position: "relative",
        transition: "transform 0.15s ease-in-out",
        "&:hover": {
          backgroundColor: active ? theme.palette.success.dark : theme.palette.error.dark,
          transform: "scale(1.04)",
        },
        "&:active": { transform: "translateY(1px) scale(1.02)" },
      }}
      disabled={loading}
      onClick={() => {
        if (!loading) onToggle();
      }}
    >
      {loading ? (
        <CircularProgress size={28} sx={{ color: "#fff" }} />
      ) : active ? (
        "Ativo"
      ) : (
        "Inativo"
      )}
    </Button>
  );
}

// src/components/SaveCancelBar.tsx
import { Box, Button, CircularProgress, useTheme } from "@mui/material";

type Props = {
  onCancel: () => void;
  saveText?: string;
  cancelText?: string;
  loading?: boolean;
  disabled?: boolean;
};

export default function SaveCancelBar({
  onCancel,
  saveText = "Salvar",
  cancelText = "Cancelar",
  loading = false,
  disabled = false,
}: Props) {
  const theme = useTheme();

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "flex-end",
        gap: 2,
        mt: 2,
        width: "100%",
      }}
    >
      <Button
        variant="outlined"
        onClick={onCancel}
        sx={{
          flex: 1,
          height: 48,
          borderWidth: 2,
          "&:hover": { bgcolor: "grey.300" },
        }}
      >
        {cancelText}
      </Button>

      <Button
        type="submit"
        variant="contained"
        color="success"
        sx={{
          flex: 1,
          height: 48,
          color: "#fff",
          backgroundColor: theme.palette.success.main,
          "&:hover": { backgroundColor: theme.palette.success.dark },
        }}
        disabled={disabled || loading}
        startIcon={loading ? <CircularProgress size={20} /> : null}
      >
        {loading ? "A guardar..." : saveText}
      </Button>
    </Box>
  );
}

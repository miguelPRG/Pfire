import React from "react";
import { Box, Button, CircularProgress } from "@mui/material";

interface FormActionsProps {
  onCancel: () => void;
  submitting?: boolean;
  submitLabel: string;
  loadingLabel?: string;
  cancelLabel?: string;
}

const FormActions: React.FC<FormActionsProps> = ({
  onCancel,
  submitting = false,
  submitLabel,
  loadingLabel,
  cancelLabel = "Cancelar",
}) => {
  const label = submitting && loadingLabel ? loadingLabel : submitLabel;

  return (
    <Box
      sx={{
        display: "flex",
        gap: 2,
        mt: 2,
        width: "100%",
        justifyContent: "flex-end",
      }}
    >
      <Button
        type="button"
        variant="outlined"
        onClick={onCancel}
        sx={{
          minWidth: 140,
          height: 44,
          flexShrink: 0,
          textTransform: "none",
        }}
      >
        {cancelLabel}
      </Button>
      <Button
        type="submit"
        variant="contained"
        color="primary"
        disabled={submitting}
        sx={{
          minWidth: 140,
          height: 44,
          flexShrink: 0,
          textTransform: "none",
        }}
      >
        {submitting ? <CircularProgress size={22} color="inherit" /> : label}
      </Button>
    </Box>
  );
};

export default FormActions;

import { Chip, Box } from "@mui/material";
import WarningIcon from "@mui/icons-material/Warning";
import { useTheme } from "@mui/material/styles";

interface LimitIndicatorProps {
  current: number;
  limit: number;
  label: string;
  resourceName: string;
}

export function LimitIndicator({ current, limit, label, resourceName }: LimitIndicatorProps) {
  const theme = useTheme();

  if (limit === Infinity) {
    return null; // Sem limite
  }

  const remaining = limit - current;
  const percentage = (current / limit) * 100;

  // Mostrar aviso quando atingiu 80% ou mais
  if (percentage >= 80) {
    const message =
      remaining === 0
        ? `Limite de ${limit} ${resourceName}(s) atingido`
        : `${remaining} ${resourceName}(s) restante(s) de ${limit}`;

    return (
      <Chip
        icon={<WarningIcon />}
        label={message}
        color="warning"
        variant="outlined"
        size="small"
        sx={{
          fontWeight: "bold",
          borderColor: theme.palette.warning.main,
          backgroundColor: theme.palette.mode === "dark" ? "rgba(255, 193, 7, 0.1)" : "rgba(255, 193, 7, 0.05)",
        }}
      />
    );
  }

  return null;
}

interface ResourceCountProps {
  current: number;
  limit: number;
  resourceName: string;
}

export function ResourceCount({ current, limit, resourceName }: ResourceCountProps) {
  const theme = useTheme();

  if (limit === Infinity) {
    return (
      <Box sx={{ fontSize: "0.875rem", color: theme.palette.text.secondary }}>
        {current} {resourceName}(s)
      </Box>
    );
  }

  return (
    <Box sx={{ fontSize: "0.875rem", color: theme.palette.text.secondary }}>
      {current} / {limit} {resourceName}(s)
    </Box>
  );
}

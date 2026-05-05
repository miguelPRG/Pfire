import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import CheckIcon from "@mui/icons-material/Check";
import { useTheme } from "@mui/material/styles";
import { useNavigate } from "react-router-dom";

interface LimitReachedDialogProps {
  open: boolean;
  onClose: () => void;
  resourceType: "empresa" | "modelo" | "utilizador" | "relatório";
  currentPlan: string;
  limit: number;
  current: number;
}

const upgradePlansByResource = {
  empresa: {
    message: "Você atingiu o limite de empresas do seu plano",
    currentLimit: "Plano Free: 1 empresa",
    nextPlan: "Plano Pro: 5 empresas",
    suggestion: "Faça upgrade para o plano Pro ou Premium para gerenciar mais empresas.",
  },
  modelo: {
    message: "Você atingiu o limite de modelos do seu plano",
    currentLimit: "Plano Free: 1 modelo por empresa",
    nextPlan: "Plano Pro: 25 modelos por empresa",
    suggestion: "Faça upgrade para o plano Pro ou Premium para criar mais modelos.",
  },
  utilizador: {
    message: "Você atingiu o limite de utilizadores do seu plano",
    currentLimit: "Plano Free: 3 utilizadores",
    nextPlan: "Plano Pro: 15 utilizadores | Plano Premium: 50 utilizadores",
    suggestion: "Faça upgrade para o plano Pro ou Premium para adicionar mais utilizadores.",
  },
  relatório: {
    message: "Você atingiu o limite de relatórios do seu plano",
    currentLimit: "Todos os planos: Ilimitados",
    nextPlan: "N/A",
    suggestion: "Você tem acesso ilimitado a relatórios.",
  },
};

export function LimitReachedDialog({
  open,
  onClose,
  resourceType,
  currentPlan,
  limit,
  current,
}: LimitReachedDialogProps) {
  const theme = useTheme();
  const navigate = useNavigate();
  const resourceInfo = upgradePlansByResource[resourceType];

  const handleUpgrade = () => {
    onClose();
    navigate("/pricing");
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: "bold", fontSize: "1.25rem" }}>{resourceInfo.message}</DialogTitle>
      <DialogContent sx={{ py: 3 }}>
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
            Plano atual: <strong>{currentPlan}</strong>
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Limite:{" "}
            <strong>
              {current} / {limit}
            </strong>
          </Typography>
        </Box>

        <Box sx={{ my: 3, p: 2, backgroundColor: theme.palette.background.default, borderRadius: 2 }}>
          <Typography variant="body2" sx={{ mb: 2, fontWeight: "bold" }}>
            Limites por plano:
          </Typography>
          <List dense sx={{ pl: 0 }}>
            <ListItem disableGutters>
              <ListItemIcon sx={{ minWidth: 32 }}>
                <CheckIcon sx={{ fontSize: "1.2rem", color: theme.palette.success.main }} />
              </ListItemIcon>
              <ListItemText primary={resourceInfo.currentLimit} />
            </ListItem>
            <ListItem disableGutters>
              <ListItemIcon sx={{ minWidth: 32 }}>
                <CheckIcon sx={{ fontSize: "1.2rem", color: theme.palette.info.main }} />
              </ListItemIcon>
              <ListItemText primary={resourceInfo.nextPlan} />
            </ListItem>
          </List>
        </Box>

        <Typography variant="body2" sx={{ color: theme.palette.info.main, fontWeight: "500" }}>
          {resourceInfo.suggestion}
        </Typography>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} variant="outlined">
          Cancelar
        </Button>
        <Button onClick={handleUpgrade} variant="contained" color="primary">
          Ver Planos
        </Button>
      </DialogActions>
    </Dialog>
  );
}

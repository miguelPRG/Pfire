import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";

type DeleteAccountSectionProps = {
  confirmOpen: boolean;
  setConfirmOpen: (open: boolean) => void;
  confirmText: string;
  setConfirmText: (text: string) => void;
  deactivating: boolean;
  onConfirmDeactivate: () => void;
};

export default function DeleteAccountSection({
  confirmOpen,
  setConfirmOpen,
  confirmText,
  setConfirmText,
  deactivating,
  onConfirmDeactivate,
}: DeleteAccountSectionProps) {
  return (
    <Paper
      elevation={3}
      sx={{
        p: 3,
        borderRadius: 3,
        mt: 2,
        mx: "auto",
        width: "100%",
        maxWidth: "700px",
        border: "1px solid",
        borderColor: "error.light",
        bgcolor: "error.lighter",
      }}
    >
      <Stack
        direction="row"
        spacing={2}
        sx={{
          alignItems: "center",
          mb: 2,
        }}
      >
        <WarningAmberIcon color="error" />
        <Typography
          variant="h2"
          sx={{
            fontWeight: "bold",
            color: "error.main",
          }}
        >
          Apagar utilizador
        </Typography>
      </Stack>

      <Typography variant="body1" sx={{ mb: 2 }}>
        A sua conta será apagada e o sistema terminará a sessão automaticamente. Será retida por 30 dias até ser
        apagada permanentemente.
      </Typography>

      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
        }}
      >
        <Button variant="outlined" color="error" onClick={() => setConfirmOpen(true)} disabled={deactivating}>
          {deactivating ? "Processando..." : "Apagar conta"}
        </Button>
      </Box>

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Confirmar exclusão</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            Esta ação irá apagar a sua conta. Para confirmar, escreva <b>Apagar</b> no campo abaixo.
          </Typography>
          <TextField
            autoFocus
            fullWidth
            label="Confirmar"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="Apagar"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)} disabled={deactivating}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={onConfirmDeactivate}
            disabled={deactivating || confirmText !== "Apagar"}
          >
            {deactivating ? "Desativando..." : "Confirmar"}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}

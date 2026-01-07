import { Snackbar, Alert } from "@mui/material";

export default function Notification({
  alert,
  setAlert,
}: {
  alert: { message: string; isError: boolean } | null;
  setAlert: React.Dispatch<React.SetStateAction<{ message: string; isError: boolean } | null>>;
}) {
  return (
    <Snackbar
      open={!!alert}
      autoHideDuration={5000}
      onClose={() => setAlert(null)}
      anchorOrigin={{ vertical: "top", horizontal: "center" }}
    >
      <Alert onClose={() => setAlert(null)} severity={alert?.isError ? "error" : "success"} sx={{ width: "100%" }}>
        {alert?.message}
      </Alert>
    </Snackbar>
  );
}

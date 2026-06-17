import { Box, CircularProgress } from "@mui/material";

export default function LoadingAnimation() {
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "80vh",
      }}
    >
      <CircularProgress />
    </Box>
  );
}

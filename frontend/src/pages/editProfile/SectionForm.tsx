import { Box, Paper, Typography } from "@mui/material";

type SectionFormProps = {
  title: string;
  onSubmit: React.InputEventHandler<HTMLFormElement>;
  children: React.ReactNode;
};

export default function SectionForm({ title, onSubmit, children }: SectionFormProps) {
  return (
    <Paper elevation={3} sx={{ p: 3, borderRadius: 3, mt: 2, mx: "auto", width: "100%", maxWidth: "700px" }}>
      <Box
        sx={{
          mb: 3,
          textAlign: "center",
        }}
      >
        <Typography
          variant="h1"
          sx={{
            fontWeight: "bold",
          }}
        >
          {title}
        </Typography>
      </Box>
      <Box component="form" onSubmit={onSubmit}>
        {children}
      </Box>
    </Paper>
  );
}

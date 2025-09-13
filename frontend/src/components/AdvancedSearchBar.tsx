import { Box, Stack, FormControl, InputLabel, Select, MenuItem, TextField, Button, useTheme } from "@mui/material";

type FieldOption = { value: string; label: string };
type AdvState = { field: string; text: string };

export default function AdvancedSearchBar({
  fields,
  value,
  onChange,
  onApply,
}: {
  fields: FieldOption[];
  value: AdvState;
  onChange: (next: AdvState) => void;
  onApply?: () => void;
}) {
  const theme = useTheme();
  const controlWidth = { xs: "100%", sm: 280 };

  const handleApply = () => {
    if (onApply) onApply();
  };

  return (
    <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        alignItems={{ xs: "stretch", sm: "center" }}
        sx={{
          p: 2,
          borderRadius: 2,
          border: `1px solid ${theme.palette.mode === "dark" ? theme.palette.divider : "#e7eaf3"}`,
          bgcolor: theme.palette.mode === "dark" ? "#0b1220" : "#fff",
          width: "100%",
          maxWidth: 920,
        }}
      >
        <FormControl size="small" sx={{ width: controlWidth }}>
          <InputLabel id="adv-field-label">Campo</InputLabel>
          <Select
            labelId="adv-field-label"
            label="Campo"
            value={value.field}
            onChange={(e) => onChange({ field: e.target.value as string, text: value.text })}
          >
            {fields.map((f) => (
              <MenuItem key={f.value} value={f.value}>
                {f.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          size="small"
          label="Valor"
          value={value.text}
          onChange={(e) => onChange({ field: value.field, text: e.target.value })}
          sx={{ width: controlWidth }}
        />

        <Stack direction="row" spacing={1} justifyContent="flex-end">
          <Button variant="contained" onClick={handleApply} sx={{ minWidth: 112 }}>
            Aplicar
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
}

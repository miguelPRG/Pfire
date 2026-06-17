import {
  Box,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  useTheme,
  Checkbox,
  FormControlLabel,
} from "@mui/material";

type FieldOption = { value: string; label: string };
type AdvState = { field: string; text: string };

export default function AdvancedSearchBar({
  fields,
  value,
  onChange,
  onApply,
  onClear,
  booleanFields = [], // nuevos prop opcional
}: {
  fields: FieldOption[];
  value: AdvState;
  onChange: (next: AdvState) => void;
  onApply?: () => void;
  onClear?: () => void;
  booleanFields?: string[]; // indica qué campos son booleanos
}) {
  const theme = useTheme();
  const controlWidth = { xs: "100%" };
  const isDark = theme.palette.mode === "dark";

  const handleApply = () => {
    // Para booleanos no aplicamos trim, para texto sí
    const isBool = booleanFields.includes(value.field);
    const textValue = isBool ? value.text : (value.text ?? "").toString().trim();
    onChange({ field: value.field, text: textValue });
    if (onApply) onApply();
  };

  const handleClear = () => {
    onChange({ field: "", text: "" });
    if (onClear) onClear();
  };

  const isBooleanField = booleanFields.includes(value.field);

  return (
    <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
      <Stack
        direction={{ sm: "column", md: "row" }}
        spacing={2}
        sx={{
          alignItems: { sm: "stretch", md: "center" },
          p: 2,
          borderRadius: 2,
          border: `1px solid ${isDark ? theme.palette.divider : "#e7eaf3"}`,
          bgcolor: isDark ? "#0b1220" : "#fff",
          width: "100%",
        }}
      >
        <FormControl size="small" sx={{ width: controlWidth }}>
          <InputLabel id="adv-field-label">Campo</InputLabel>
          <Select
            labelId="adv-field-label"
            label="Campo"
            value={value.field}
            onChange={(e) => onChange({ field: e.target.value as string, text: value.text })}
            MenuProps={{
              slotProps: {
                paper: {
                  sx: {
                    maxWidth: 280,
                  },
                },
              },
            }}
          >
            {fields.map((field) => (
              <MenuItem key={field.value} value={field.value}>
                {field.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {isBooleanField ? (
          <FormControlLabel
            control={
              <Checkbox
                checked={value.text === "true"}
                onChange={(e) => onChange({ field: value.field, text: e.target.checked ? "true" : "false" })}
              />
            }
            label="Ativo"
            sx={{ width: controlWidth }}
          />
        ) : (
          <TextField
            size="small"
            label="Pesquisar"
            value={value.text}
            onChange={(e) => onChange({ field: value.field, text: e.target.value })}
            sx={{ width: controlWidth }}
            disabled={!value.field}
          />
        )}

        <Stack
          direction="row"
          spacing={1}
          sx={{
            justifyContent: "flex-end",
          }}
        >
          <Button
            variant="contained"
            onClick={handleApply}
            sx={{ minWidth: 112 }}
            disabled={!value.field || !value.text}
          >
            Aplicar
          </Button>
          <Button
            variant="outlined"
            color="secondary"
            onClick={handleClear}
            sx={{ minWidth: 112 }}
            disabled={!value.field || !value.text}
          >
            Limpar
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
}

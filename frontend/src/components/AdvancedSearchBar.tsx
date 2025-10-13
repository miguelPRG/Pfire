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
  const controlWidth = { xs: "100%", sm: 280 };
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
        alignItems={{ sm: "stretch", md: "center" }}
        sx={{
          p: 2,
          borderRadius: 2,
          border: `1px solid ${isDark ? theme.palette.divider : "#e7eaf3"}`,
          bgcolor: isDark ? "#0b1220" : "#fff",
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
            MenuProps={{
              PaperProps: {
                sx: {
                  maxWidth: 280,
                },
              },
            }}
            sx={{
              bgcolor: isDark ? "#0b1220" : undefined,
              color: isDark ? theme.palette.text.primary : undefined,
              "& .MuiSelect-select": {
                color: isDark ? theme.palette.text.primary : undefined,
              },
            }}
          >
            {fields.map((f) => (
              <MenuItem key={f.value} value={f.value} sx={{ bgcolor: isDark ? "#0b1220" : undefined }}>
                {f.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {isBooleanField ? (
          <FormControlLabel
            control={
              <Checkbox
                checked={value.text === "true"}
                onChange={(e) =>
                  onChange({
                    field: value.field,
                    text: e.target.checked ? "true" : "",
                  })
                }
                color="primary"
              />
            }
            label="Ativo"
            sx={{ width: controlWidth }}
          />
        ) : value.field === "role" ? (
          <FormControl size="small" sx={{ width: controlWidth }}>
            <InputLabel id="adv-role-label">Qual é o papel?</InputLabel>            
            <Select
              labelId="adv-role-label"
              value={value.text || ""}
              onChange={(e) => onChange({ field: value.field, text: e.target.value as string })}
              sx={{
                width: controlWidth,
                bgcolor: isDark ? "#0b1220" : undefined,
                color: isDark ? theme.palette.text.primary : undefined,
              }}
              MenuProps={{
                PaperProps: {
                  sx: {
                    maxWidth: 280,
                  },
                },
              }}
            >
              <MenuItem value="Técnico">Técnico</MenuItem>
              <MenuItem value="Admin">Admin</MenuItem>
            </Select>
          </FormControl>
        ) : (
          <TextField
            size="small"
            label="Valor"
            value={value.text}
            onChange={(e) => onChange({ field: value.field, text: e.target.value })}
            sx={{
              width: controlWidth,
              bgcolor: isDark ? "#0b1220" : undefined,
              input: { color: isDark ? theme.palette.text.primary : undefined },
            }}
            disabled={!value.field}
          />
        )}

        <Stack direction="row" spacing={1} justifyContent="flex-end">
          <Button 
            variant="contained" 
            onClick={handleApply} 
            sx={{ minWidth: 112 }}
            disabled={!value.field || !value.text} // Desativa se campo ou valor estiverem vazios
          >
            Aplicar
          </Button>
          <Button
            variant="outlined"
            color="secondary"
            onClick={handleClear}
            sx={{ minWidth: 112 }}
            disabled={!value.field || !value.text} // Desativa se campo ou valor estiverem vazios
          >
            Limpar
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
}

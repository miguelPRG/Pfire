import { Box, FormControl, InputLabel, Select, MenuItem } from "@mui/material";
import { useCriteriosByModeloQuery } from "../../../features/criterios/hooks";

interface CriteriaSelectFieldProps {
  modelId: string;
  value?: string;
  onChange: (value: string) => void;
  label?: string;
  error?: string;
}

export default function CriteriaSelectField({
  modelId,
  value = "",
  onChange,
  label = "Critério",
  error,
}: CriteriaSelectFieldProps) {
  const { data } = useCriteriosByModeloQuery<{
    getCriteria: Array<{ options: Array<{ key: string; value: string }> }>;
  }>(modelId, Boolean(modelId));

  // Extrai opções
  const options = data?.getCriteria[0]?.options || [];

  return (
    <Box sx={{ width: "100%", mt: 1 }}>
      <FormControl fullWidth error={!!error}>
        <InputLabel>{label}</InputLabel>
        <Select
          value={value}
          label={label}
          onChange={(e) => onChange(e.target.value as string)}
          MenuProps={{
            PaperProps: {
              sx: {
                maxWidth: "300px",
                width: "75%",
              },
            },
          }}
        >
          {options.length > 0 ? (
            options.map((option: any) => (
              <MenuItem key={option.key} value={option.key}>
                {option.key} - {option.value}
              </MenuItem>
            ))
          ) : (
            <MenuItem disabled sx={{ whiteSpace: "normal", fontWeight: "bold" }}>
              O modelo não possui nenhuma lista de critérios.
              <br />
              Crie uma lista de critérios ou altere o tipo de dados deste campo.
            </MenuItem>
          )}
        </Select>
        {error && <span style={{ color: "red", fontSize: 12 }}>{error}</span>}
      </FormControl>
    </Box>
  );
}

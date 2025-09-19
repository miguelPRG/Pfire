import { Box, FormControl, InputLabel, Select, MenuItem } from "@mui/material";
import { useQuery } from "@apollo/client/react";
import { GET_CRITERIA_BY_MODEL } from "../../../graphql/criteriaQueries";

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
  const { data } = useQuery(GET_CRITERIA_BY_MODEL, {
    variables: { modelId },
    fetchPolicy: "cache-first",
  });

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
                width: "75%"
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
            <MenuItem disabled>
              O modelo não possui nenhuma lista de critérios
            </MenuItem>
          )}
        </Select>
        {error && (
          <span style={{ color: "red", fontSize: 12 }}>{error}</span>
        )}
      </FormControl>
    </Box>
  );
}
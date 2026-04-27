import { Box, TextField, InputAdornment, MenuItem, Select, FormControl } from "@mui/material";
import { Search } from "@mui/icons-material";

export type FilterField = "nome" | "localidade" | "nif";
export type Operator = "contains" | "equals" | "startsWith";

export default function FilterBar({
  search,
  setSearch,
  filter1,
  setFilter1,
  filter2,
  setFilter2,
}: {
  search: string;
  setSearch: (v: string) => void;
  filter1: { field: FilterField; operator: Operator; value: string };
  setFilter1: (f: { field: FilterField; operator: Operator; value: string }) => void;
  filter2: { field: FilterField; operator: Operator; value: string };
  setFilter2: (f: { field: FilterField; operator: Operator; value: string }) => void;
}) {
  const fields: { label: string; value: FilterField }[] = [
    { label: "Nome", value: "nome" },
    { label: "Localidade", value: "localidade" },
    { label: "NIF", value: "nif" },
  ];
  const operators: { label: string; value: Operator }[] = [
    { label: "Contém", value: "contains" },
    { label: "Igual a", value: "equals" },
    { label: "Começa por", value: "startsWith" },
  ];

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: "2fr 1fr 1fr 2fr 1fr 1fr 2fr",
        gap: 2,
      }}
    >
      {/* Search */}
      <TextField
        placeholder="Pesquisar…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        size="small"
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Search />
            </InputAdornment>
          ),
        }}
      />

      {/* Filtro 1 */}
      <FormControl size="small">
        <Select value={filter1.field} onChange={(e) => setFilter1({ ...filter1, field: e.target.value as any })}>
          {fields.map((f) => (
            <MenuItem key={f.value} value={f.value}>
              {f.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <FormControl size="small">
        <Select value={filter1.operator} onChange={(e) => setFilter1({ ...filter1, operator: e.target.value as any })}>
          {operators.map((o) => (
            <MenuItem key={o.value} value={o.value}>
              {o.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <TextField
        placeholder="Valor"
        value={filter1.value}
        onChange={(e) => setFilter1({ ...filter1, value: e.target.value })}
        size="small"
      />

      {/* Filtro 2 */}
      <FormControl size="small">
        <Select value={filter2.field} onChange={(e) => setFilter2({ ...filter2, field: e.target.value as any })}>
          {fields.map((f) => (
            <MenuItem key={f.value} value={f.value}>
              {f.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <FormControl size="small">
        <Select value={filter2.operator} onChange={(e) => setFilter2({ ...filter2, operator: e.target.value as any })}>
          {operators.map((o) => (
            <MenuItem key={o.value} value={o.value}>
              {o.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <TextField
        placeholder="Valor"
        value={filter2.value}
        onChange={(e) => setFilter2({ ...filter2, value: e.target.value })}
        size="small"
      />
    </Box>
  );
}

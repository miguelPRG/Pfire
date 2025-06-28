/*import { useState } from "react";
import {
  Box,
  Button,
  MenuItem,
  MobileStepper,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import KeyboardArrowLeft from "@mui/icons-material/KeyboardArrowLeft";
import KeyboardArrowRight from "@mui/icons-material/KeyboardArrowRight";

const fieldTypes = ["string", "number", "bool", "date", "object"];
const fieldTypeLabels: Record<string, string> = {
  string: "Texto",
  number: "Número",
  bool: "Sim/Não",
  date: "Data",
  object: "Multi-campos",
};

export function MobileSubfieldsStepper({
  subfields,
  onChange,
  onRemove,
  onAdd,
  ensureCustomPrefix,
}: {
  subfields: any[];
  onChange: (index: number, updated: any) => void;
  onRemove: (index: number) => void;
  onAdd: () => void;
  ensureCustomPrefix: (key: string) => string;
}) {
  const [activeStep, setActiveStep] = useState(0);
  const maxSteps = subfields.length;

  return (
    <Box sx={{ maxWidth: "100%", flexGrow: 1, mt: 2 }}>
      <Paper
        square
        elevation={0}
        sx={{
          display: "flex",
          alignItems: "center",
          height: 50,
          pl: 2,
          bgcolor: "background.default",
        }}
      >
        <Typography>Subcampo {activeStep + 1}</Typography>
      </Paper>

   <Box sx={{ p: 2 }}>
  {maxSteps > 0 && (
    <>
      <TextField
        fullWidth
        label="Nome"
        value={subfields[activeStep].key.replace(/^custom_/, "")}
        onChange={(e) => {
          const updated = {
            ...subfields[activeStep],
            key: ensureCustomPrefix(e.target.value),
          };
          onChange(activeStep, updated);
        }}
        sx={{ mb: 2 }}
      />

      <TextField
        fullWidth
        select
        label="Tipo"
        value={subfields[activeStep].datatype}
        onChange={(e) => {
          const value = e.target.value;
          const updated = {
            ...subfields[activeStep],
            datatype: value,
            subfields:
              value === "object"
                ? [
                    {
                      key: `custom_${Date.now()}`,
                      datatype: "string",
                      required: false,
                      subfields: [],
                    },
                  ]
                : [],
          };
          onChange(activeStep, updated);
        }}
        sx={{ mb: 2 }}
      >
        {fieldTypes.map((type) => (
          <MenuItem key={type} value={type}>
            {fieldTypeLabels[type]}
          </MenuItem>
        ))}
      </TextField>

      <TextField
        fullWidth
        select
        label="Obrigatório"
        value={String(subfields[activeStep].required)}
        onChange={(e) => {
          const updated = {
            ...subfields[activeStep],
            required: e.target.value === "true",
          };
          onChange(activeStep, updated);
        }}
        sx={{ mb: 2 }}
      >
        <MenuItem value="true">Sim</MenuItem>
        <MenuItem value="false">Não</MenuItem>
      </TextField>

      <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
        <Button
          variant="outlined"
          color="error"
          onClick={() => onRemove(activeStep)}
          fullWidth
        >
          Remover
        </Button>

        <Button
          variant="outlined"
          color="primary"
          onClick={onAdd}
          fullWidth
        >
          + Subcampo
        </Button>
      </Box>

      
      {subfields[activeStep].datatype === "object" &&
        subfields[activeStep].subfields.map((sub, i) => (
          <Box
            key={i}
            sx={{ p: 2, border: "1px dashed #ccc", borderRadius: 2, mb: 2 }}
          >
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Sub-subcampo {i + 1}
            </Typography>

            <TextField
              fullWidth
              label="Nome"
              value={sub.key.replace(/^custom_/, "")}
              onChange={(e) => {
                const updatedSub = {
                  ...sub,
                  key: ensureCustomPrefix(e.target.value),
                };
                const updated = { ...subfields[activeStep] };
                updated.subfields[i] = updatedSub;
                onChange(activeStep, updated);
              }}
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              select
              label="Tipo"
              value={sub.datatype}
              onChange={(e) => {
                const updatedSub = {
                  ...sub,
                  datatype: e.target.value,
                  subfields:
                    e.target.value === "object" ? [] : [],
                };
                const updated = { ...subfields[activeStep] };
                updated.subfields[i] = updatedSub;
                onChange(activeStep, updated);
              }}
              sx={{ mb: 2 }}
            >
              {fieldTypes.map((type) => (
                <MenuItem key={type} value={type}>
                  {fieldTypeLabels[type]}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              fullWidth
              select
              label="Obrigatório"
              value={String(sub.required)}
              onChange={(e) => {
                const updatedSub = {
                  ...sub,
                  required: e.target.value === "true",
                };
                const updated = { ...subfields[activeStep] };
                updated.subfields[i] = updatedSub;
                onChange(activeStep, updated);
              }}
              sx={{ mb: 2 }}
            />
          </Box>
        ))}

      {subfields[activeStep].datatype === "object" && (
        <Button
          variant="outlined"
          onClick={() => {
            const updated = { ...subfields[activeStep] };
            updated.subfields.push({
              key: `custom_${Date.now()}`,
              datatype: "string",
              required: false,
              subfields: [],
            });
            onChange(activeStep, updated);
          }}
          sx={{ mt: 1 }}
          fullWidth
        >
          + Sub-subcampo
        </Button>
      )}
    </>
  )}
</Box>


      <MobileStepper
        variant="text"
        steps={maxSteps}
        position="static"
        activeStep={activeStep}
        nextButton={
          <Button
            size="small"
            onClick={() => setActiveStep((prev) => prev + 1)}
            disabled={activeStep === maxSteps - 1}
          >
            Próximo
            <KeyboardArrowRight />
          </Button>
        }
        backButton={
          <Button
            size="small"
            onClick={() => setActiveStep((prev) => prev - 1)}
            disabled={activeStep === 0}
          >
            <KeyboardArrowLeft />
            Anterior
          </Button>
        }
      />
    </Box>
  );
} */

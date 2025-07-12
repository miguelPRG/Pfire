import { Control, Controller, FieldErrors } from "react-hook-form";
import { Box, Typography, InputLabel } from "@mui/material";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import "../assets/styles/phoneNumberField.css";

export default function GlobalPhone({
  fieldName,
  control,
  errors,
}: {
  fieldName: string;
  control: Control<any>;
  errors: FieldErrors<any>;
}) {
  // Suporte para erros aninhados e não aninhados
  function getError() {
    // Para campos como "empresa.telefone" ou "companyPhone"
    if (fieldName.includes(".")) {
      const [parent, child] = fieldName.split(".");
      return errors?.[parent]?.[child];
    }
    return errors?.[fieldName];
  }
  const errorObj = getError();

  const inputId = `phone-input-${fieldName.replace(/\./g, "-")}`;

  return (
    <Box id="telefone-field" display="flex" flexDirection="column" width="100%" sx={{ mt: 1 }}>
      <InputLabel htmlFor={inputId} sx={{ mb: 1, width: "100%", textAlign: "left" }}>
        Telefone:
      </InputLabel>
      <Controller
        name={fieldName}
        control={control}
        render={({ field }) => (
          <Box sx={{ width: "100%", display: "flex", flexDirection: "column" }}>
            <Box
              sx={{
                alignItems: "center",
                border: "1px solid",
                borderColor: errorObj ? "error.main" : "rgba(0, 0, 0, 0.23)",
                borderRadius: 1,
                padding: "18.5px 14px",
                fontSize: "16px",
                width: "100%", // garante 100% da largura
                "&:hover": {
                  borderColor: "black",
                },
                "&:focus-within": {
                  borderColor: "primary.main",
                  borderWidth: 2,
                },
              }}
              aria-invalid={!!errorObj}
            >
              <PhoneInput
                {...field}
                id={inputId}
                defaultCountry="PT"
                international
                countryCallingCodeEditable={false}
                placeholder="Insira o número de telefone"
                style={{
                  fontSize: "16px",
                  border: "none",
                  outline: "none",
                  width: "100%", // garante 100% da largura
                  background: "transparent",
                }}
              />
            </Box>
            {errorObj && (
              <Typography
                color="error"
                variant="body2"
                sx={{
                  mt: 0.5,
                  ml: 5, // opcional: pequeno recuo à esquerda
                  textAlign: "left",
                }}
              >
                Número de telefone inválido
              </Typography>
            )}
          </Box>
        )}
      />
    </Box>
  );
}

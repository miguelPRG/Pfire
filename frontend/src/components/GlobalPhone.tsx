import { Control, Controller, FieldErrors } from "react-hook-form";
import { Box, Typography } from "@mui/material";
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

  return (
    <Box id="telefone-field">
      <Controller
        name={fieldName}
        control={control}
        render={({ field }) => (
          <Box sx={{ width: "100%" }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                border: "1px solid",
                borderColor: errorObj ? "error.main" : "rgba(0, 0, 0, 0.23)",
                borderRadius: 1,
                padding: "18.5px 14px",
                fontSize: "16px",
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
                defaultCountry="PT"
                international
                countryCallingCodeEditable={false}
                placeholder="Insira o número de telefone"
                style={{
                  fontSize: "16px",
                  border: "none",
                  outline: "none",
                  width: "100%",
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
                }}
              >
                {typeof errorObj === "object" && "message" in errorObj ? (errorObj as any).message : String(errorObj)}
              </Typography>
            )}
          </Box>
        )}
      />
    </Box>
  );
}

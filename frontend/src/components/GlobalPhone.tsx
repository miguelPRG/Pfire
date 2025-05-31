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
  return (
    <div id="telefone-field">
      <Controller
        name={fieldName}
        control={control}
        render={({ field }) => (
          <Box>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                border: "1px solid",
                borderColor: errors.empresa?.telefone ? "error.main" : "rgba(0, 0, 0, 0.23)",
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
              aria-invalid={!!errors.empresa?.telefone}
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
            {errors.empresa?.telefone && (
              <Typography
                color="error"
                variant="body2"
                sx={{
                  mt: 0.5,
                }}
              >
                {errors.empresa.telefone.message}
              </Typography>
            )}
          </Box>
        )}
      />
    </div>
  );
}

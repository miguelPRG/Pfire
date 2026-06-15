import { Box, Button, Grid } from "@mui/material";
import type { UseFormReturn } from "react-hook-form";
import PasswordField from "../../components/PasswordField";
import SectionForm from "./SectionForm";
import type { UserPasswordFormType } from "./schemas";

type PasswordFormProps = {
  form: UseFormReturn<UserPasswordFormType>;
  submitting: boolean;
  onSubmit: React.InputEventHandler<HTMLFormElement>;
};

export default function PasswordForm({ form, submitting, onSubmit }: PasswordFormProps) {
  return (
    <SectionForm title="Alterar Senha" onSubmit={onSubmit}>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12 }}>
          <PasswordField
            label="Password"
            fullWidth
            sx={{ width: "100%" }}
            {...form.register("password")}
            error={!!form.formState.errors.password}
            helperText={form.formState.errors.password?.message}
          />
        </Grid>
        <Grid size={{ xs: 12 }}>
          <PasswordField
            label="Nova Senha"
            fullWidth
            sx={{ width: "100%" }}
            {...form.register("newPassword")}
            error={!!form.formState.errors.newPassword}
            helperText={form.formState.errors.newPassword?.message}
          />
        </Grid>
        <Grid size={{ xs: 12 }}>
          <PasswordField
            label="Confirmar Nova Senha"
            fullWidth
            sx={{ width: "100%" }}
            {...form.register("confirmPassword")}
            error={!!form.formState.errors.confirmPassword}
            helperText={form.formState.errors.confirmPassword?.message}
          />
        </Grid>
        <Grid size={{ xs: 12 }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              mt: 2,
            }}
          >
            <Button type="submit" variant="contained" color="secondary" sx={{ width: 200 }} disabled={submitting}>
              Salvar
            </Button>
          </Box>
        </Grid>
      </Grid>
    </SectionForm>
  );
}

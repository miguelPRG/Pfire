import { Box, Button, Grid, Paper, TextField } from "@mui/material";
import CameraAltIcon from "@mui/icons-material/CameraAlt";
import type { UseFormReturn } from "react-hook-form";
import GlobalPhone from "../../components/GlobalPhone";
import SectionForm from "./SectionForm";
import type { CompanyFormType } from "./schemas";
import type { ProfileCompany } from "./types";

type CompanyFormProps = {
  form: UseFormReturn<CompanyFormType>;
  empresa: ProfileCompany | null;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  submitting: boolean;
  onSubmit: React.InputEventHandler<HTMLFormElement>;
  onDeleteLogo: () => void;
};

export default function CompanyForm({
  form,
  empresa,
  fileInputRef,
  submitting,
  onSubmit,
  onDeleteLogo,
}: CompanyFormProps) {
  const logo = form.watch("logo") || empresa?.logo;

  if (!empresa?.isAdmin) {
    return null;
  }

  return (
    <SectionForm title="Editar Dados da Empresa" onSubmit={onSubmit}>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12 }} sx={{ marginBottom: 5, marginTop: 2 }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              height: 120,
            }}
          >
            <Paper
              elevation={1}
              sx={{
                width: 200,
                height: 200,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "50%",
                bgcolor: "#f5f5f5",
                color: "#bdbdbd",
                fontSize: 32,
                fontWeight: "bold",
                border: "2px solid #bdbdbd",
                overflow: "hidden",
                position: "relative",
                cursor: "pointer",
                transition: "box-shadow 0.3s, border-color 0.3s",
                "&:hover": {
                  boxShadow: 6,
                  "& .edit-overlay": {
                    opacity: 1,
                    bgcolor: "rgba(100, 97, 97, 0.45)",
                  },
                },
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              {logo ? (
                <>
                  <img
                    src={`data:image/png;base64,${logo}`}
                    alt="Logo da empresa"
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      background: "#f5f5f5",
                      borderRadius: "50%",
                    }}
                  />
                  <Box
                    className="edit-overlay"
                    sx={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: "100%",
                      bgcolor: "rgba(25, 118, 210, 0.35)",
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      opacity: 0,
                      transition: "opacity 0.3s, background 0.3s",
                      fontSize: 22,
                      fontWeight: "bold",
                      pointerEvents: "none",
                    }}
                  >
                    <CameraAltIcon fontSize="large" />
                  </Box>
                </>
              ) : (
                <Box sx={{ textAlign: "center", fontSize: 22 }}>Insira o logotipo da empresa aqui</Box>
              )}
              <input
                ref={fileInputRef}
                accept="image/png"
                id="logo-upload"
                type="file"
                style={{ display: "none" }}
                onClick={(e) => e.stopPropagation()}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const maxSize = 1024 * 1024;
                    if (file.size > maxSize) {
                      alert("O ficheiro é demasiado grande. O limite é 1MB.");
                      return;
                    }
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      form.setValue("logo", (reader.result as string).split(",")[1]);
                    };
                    reader.readAsDataURL(file);
                  }
                }}
              />
            </Paper>
          </Box>

          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              mt: 12,
            }}
          >
            <Button variant="outlined" color="error" onClick={onDeleteLogo} disabled={submitting || !logo}>
              Apagar logotipo
            </Button>
          </Box>
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            label="Nome da Empresa"
            fullWidth
            sx={{ width: "100%" }}
            {...form.register("companyName")}
            error={!!form.formState.errors.companyName}
            helperText={form.formState.errors.companyName?.message}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            label="NIF"
            fullWidth
            sx={{ width: "100%" }}
            {...form.register("nif")}
            error={!!form.formState.errors.nif}
            helperText={form.formState.errors.nif?.message}
          />
        </Grid>
        <Grid size={{ xs: 12 }}>
          <TextField
            label="Morada"
            fullWidth
            sx={{ width: "100%" }}
            {...form.register("address")}
            error={!!form.formState.errors.address}
            helperText={form.formState.errors.address?.message}
          />
        </Grid>
        <Grid size={{ xs: 12 }}>
          <TextField
            label="Localidade"
            fullWidth
            sx={{ width: "100%" }}
            {...form.register("locality")}
            error={!!form.formState.errors.locality}
            helperText={form.formState.errors.locality?.message}
          />
        </Grid>
        <Grid size={{ xs: 12 }}>
          <TextField
            label="Código Postal"
            fullWidth
            sx={{ width: "100%" }}
            {...form.register("postalCode")}
            error={!!form.formState.errors.postalCode}
            helperText={form.formState.errors.postalCode?.message}
          />
        </Grid>
        <Grid size={{ xs: 12 }}>
          <GlobalPhone fieldName="companyPhone" control={form.control} errors={form.formState.errors} />
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

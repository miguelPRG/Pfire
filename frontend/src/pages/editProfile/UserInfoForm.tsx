import { Box, Button, Grid, Paper, TextField } from "@mui/material";
import CameraAltIcon from "@mui/icons-material/CameraAlt";
import type { UseFormReturn } from "react-hook-form";
import GlobalPhone from "../../components/GlobalPhone";
import SectionForm from "./SectionForm";
import type { ProfileUser } from "./types";
import type { UserInfoFormType } from "./schemas";

type UserInfoFormProps = {
  form: UseFormReturn<UserInfoFormType>;
  user: ProfileUser | null;
  assinaturaInputRef: React.RefObject<HTMLInputElement | null>;
  submitting: boolean;
  onSubmit: React.InputEventHandler<HTMLFormElement>;
  onDeleteSignature: () => void;
};

export default function UserInfoForm({
  form,
  user,
  assinaturaInputRef,
  submitting,
  onSubmit,
  onDeleteSignature,
}: UserInfoFormProps) {
  const assinatura = form.watch("assinatura") || user?.assinatura;

  return (
    <SectionForm title="Alterar Nome e Telefone" onSubmit={onSubmit}>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12 }} sx={{ marginBottom: 2, marginTop: 1 }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              height: 140,
            }}
          >
            <Paper
              elevation={1}
              sx={{
                width: 160,
                height: 160,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "50%",
                bgcolor: "#f5f5f5",
                color: "#bdbdbd",
                fontSize: 18,
                fontWeight: 500,
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
              onClick={() => assinaturaInputRef.current?.click()}
            >
              {assinatura ? (
                <>
                  <img
                    src={`data:image/png;base64,${assinatura}`}
                    alt="Assinatura do utilizador"
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
                      inset: 0,
                      left: 0,
                      borderRadius: "50%",
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
                <Box sx={{ textAlign: "center" }}>Insira a assinatura aqui</Box>
              )}
              <input
                ref={assinaturaInputRef}
                accept="image/png, image/jpeg, image/jpg"
                id="assinatura-upload"
                type="file"
                style={{ display: "none" }}
                onClick={(e) => e.stopPropagation()}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const maxSize = 1024 * 1024;
                    const allowedTypes = ["image/png", "image/jpeg", "image/jpg"];
                    if (!allowedTypes.includes(file.type)) {
                      alert("Apenas imagens JPG, JPEG ou PNG são permitidas.");
                      return;
                    }
                    if (file.size > maxSize) {
                      alert("O ficheiro é demasiado grande. O limite é 1MB.");
                      return;
                    }
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      form.setValue("assinatura", (reader.result as string).split(",")[1], {
                        shouldDirty: true,
                        shouldValidate: false,
                      });
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
              mt: 5,
            }}
          >
            <Button variant="outlined" color="error" onClick={onDeleteSignature} disabled={submitting || !assinatura}>
              Apagar assinatura
            </Button>
          </Box>
        </Grid>

        <Grid size={{ xs: 12 }}>
          <TextField
            label="Nome"
            fullWidth
            sx={{ width: "100%" }}
            {...form.register("name")}
            error={!!form.formState.errors.name}
            helperText={form.formState.errors.name?.message}
          />
        </Grid>
        <Grid size={{ xs: 12 }}>
          <GlobalPhone fieldName="telefone" control={form.control} errors={form.formState.errors} />
        </Grid>
        <Grid size={{ xs: 12 }}>
          <TextField label="Email" fullWidth sx={{ width: "100%" }} disabled value={user?.email || ""} />
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

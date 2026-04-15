import { useAuth } from "../hooks/AuthContext";
import {
  Box,
  Button,
  Chip,
  Container,
  TextField,
  Typography,
  Paper,
  Grid,
  Alert,
  Breadcrumbs,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  CircularProgress,
  Tooltip,
  IconButton,
} from "@mui/material";
import { Delete } from "@mui/icons-material";
import { useForm, SubmitHandler } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import GlobalPhone from "../components/GlobalPhone";
import { useCallback, useEffect, useState, useRef } from "react";
import isValidNIF from "./utils/isValidNIF";
import CameraAltIcon from "@mui/icons-material/CameraAlt";
import PasswordField from "../components/PasswordField";
import StyledBreadcrumb from "../components/StyledBreadCrumbs";
import { useNavigate } from "react-router-dom";
import HomeIcon from "@mui/icons-material/Home";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import visaLogo from "../assets/images/cards/visa.png";
import mastercardLogo from "../assets/images/cards/mastercard.png";
import amexLogo from "../assets/images/cards/americanExpress.png";
import discoverLogo from "../assets/images/cards/discover.png";
import genericCardLogo from "../assets/images/logo.png";

// Schemas
const userInfoSchema = z.object({
  name: z.string().nonempty("Nome é obrigatório").trim(),
  telefone: z
    .string()
    .trim()
    .regex(/^[+]?\d{9,15}$/, "Número de telefone inválido")
    .optional(),
  assinatura: z.string().optional(), // Removido z.base64() para aceitar string vazia
});
const userPasswordSchema = z
  .object({
    password: z.string().nonempty("Senha atual é obrigatória"),
    newPassword: z
      .string()
      .nonempty("A nova senha é obrigatória")
      .min(9, "A nova senha deve ter pelo menos 9 caracteres")
      .regex(/[A-Z]/, "A nova senha deve conter pelo menos uma letra maiúscula")
      .regex(/\d/, "A nova senha deve conter pelo menos um número"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Não coincide com a nova senha",
    path: ["confirmPassword"],
  });

const companySchema = z.object({
  companyName: z.string().trim(),
  nif: z
    .string()
    .min(9, "O NIF deve ter 9 caracteres")
    .max(9, "O NIF deve ter 9 caracteres")
    .trim()
    .refine((nif) => isValidNIF(nif), { message: "NIF Inválido" }),
  address: z.string().trim(),
  locality: z.string().trim(),
  postalCode: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{3}$/, "Formato inválido"),
  companyPhone: z
    .string()
    .trim()
    .regex(/^[+]?\d{9,15}$/, "Número inválido"),
  logo: z.base64().optional(),
});

// Types
type UserInfoFormType = z.infer<typeof userInfoSchema>;
type UserPasswordFormType = z.infer<typeof userPasswordSchema>;
type CompanyFormType = z.infer<typeof companySchema>;

type MessageType = { error: boolean; message: string } | null;

type PaymentMethodType = {
  id: string;
  brand: string | null;
  last4: string | null;
  expMonth: number | null;
  expYear: number | null;
  maskedNumber: string;
  isDefault: boolean;
};

function normalizePaymentMethods(data: any): PaymentMethodType[] {
  // Helper to extract actual data from Stripe SDK objects
  function extractData(obj: any): any {
    if (!obj) return obj;
    // If it has _data, use that (recursively), otherwise return as is
    return obj._data ? extractData(obj._data) : obj;
  }

  let paymentArray: any[] = [];

  // Try to extract the array from various possible structures
  if (Array.isArray(data)) {
    paymentArray = data;
  } else if (Array.isArray(data?.data)) {
    paymentArray = data.data;
  } else if (Array.isArray(data?.payment_methods)) {
    paymentArray = data.payment_methods;
  } else {
    return [];
  }

  const defaultPaymentMethodId = data?.default_payment_method_id ?? null;

  return paymentArray
    .map((item: any) => {
      try {
        const paymentData = extractData(item);

        if (paymentData?.type !== "card") return null;

        const cardData = extractData(paymentData.card);
        if (!cardData) return null;

        const last4 = cardData.last4 ?? null;

        return {
          id: paymentData.id,
          brand: cardData.display_brand ?? cardData.brand ?? null,
          last4,
          maskedNumber: last4 ? `**** **** **** ${last4}` : "**** **** **** ----",
          expMonth: cardData.exp_month ?? null,
          expYear: cardData.exp_year ?? null,
          isDefault: paymentData.id === defaultPaymentMethodId,
        };
      } catch (err) {
        console.warn("Erro ao normalizar método de pagamento:", err, item);
        return null;
      }
    })
    .filter((item: any): item is PaymentMethodType => item !== null);
}

function getPaymentBrandKey(brand: string | null): string {
  const normalized = (brand || "").toLowerCase().replace(/\s+/g, "_");
  if (normalized === "amex" || normalized === "american_express") {
    return "american_express";
  }
  return normalized;
}

function getPaymentBrandName(brand: string | null): string {
  const key = getPaymentBrandKey(brand);
  if (key === "visa") return "Visa";
  if (key === "mastercard") return "Mastercard";
  if (key === "american_express") return "American Express";
  if (key === "discover") return "Discover";
  return "Cartão";
}

function getPaymentBrandImage(brand: string | null): string {
  const key = getPaymentBrandKey(brand);
  if (key === "visa") return visaLogo;
  if (key === "mastercard") return mastercardLogo;
  if (key === "american_express") return amexLogo;
  if (key === "discover") return discoverLogo;
  return genericCardLogo;
}

function isPaymentMethodExpired(paymentMethod: PaymentMethodType): boolean {
  if (!paymentMethod.expMonth || !paymentMethod.expYear) {
    return false;
  }

  // O cartão é válido até ao último dia do mês de expiração.
  const expiryEndDate = new Date(paymentMethod.expYear, paymentMethod.expMonth, 0, 23, 59, 59, 999);
  return new Date() > expiryEndDate;
}

function getPaymentExpiryLabel(paymentMethod: PaymentMethodType): string {
  if (!paymentMethod.expMonth || !paymentMethod.expYear) {
    return "--/--";
  }

  const month = String(paymentMethod.expMonth).padStart(2, "0");
  const shortYear = String(paymentMethod.expYear).slice(-2);
  return `${month}/${shortYear}`;
}

interface SectionFormProps {
  title: string;
  onSubmit: React.InputEventHandler<HTMLFormElement>;
  children: React.ReactNode;
  message?: MessageType;
  setMessage?: React.Dispatch<React.SetStateAction<MessageType>>;
}

// SectionForm tipado
function SectionForm({ title, onSubmit, children }: Omit<SectionFormProps, "message" | "setMessage">) {
  return (
    <Paper elevation={3} sx={{ p: 3, borderRadius: 3, mt: 2, mx: "auto", width: "100%", maxWidth: "700px" }}>
      <Box
        sx={{
          mb: 3,
          textAlign: "center",
        }}
      >
        <Typography
          variant="h1"
          sx={{
            fontWeight: "bold",
          }}
        >
          {title}
        </Typography>
      </Box>
      <Box component="form" onSubmit={onSubmit}>
        {children}
      </Box>
    </Paper>
  );
}

function EditProfilePage() {
  const { user, empresa, updateUser, updatePassword, updateCompany, logout } = useAuth();
  const navigate = useNavigate();

  // Estado global para o alerta
  const [globalMessage, setGlobalMessage] = useState<MessageType>(null);

  // Estado para loading dos botões
  const [submitting, setSubmitting] = useState<{
    info: boolean;
    password: boolean;
    company: boolean;
  }>({ info: false, password: false, company: false });

  // Estado para confirmação de desativação (REST v1)
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deactivating, setDeactivating] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodType[]>([]);
  const [loadingPaymentMethod, setLoadingPaymentMethod] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [redirectingToBilling, setRedirectingToBilling] = useState(false);
  const [updatingDefaultPaymentId, setUpdatingDefaultPaymentId] = useState<string | null>(null);
  const [removingPaymentId, setRemovingPaymentId] = useState<string | null>(null);

  // Ref para o topo da página
  const topRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const assinaturaInputRef = useRef<HTMLInputElement>(null); // ref do input da assinatura

  const userInfoForm = useForm<UserInfoFormType>({
    resolver: zodResolver(userInfoSchema),
    defaultValues: { name: "", telefone: "", assinatura: "" }, // default para assinatura
    shouldUnregister: true,
    mode: "onSubmit",
  });
  const userPasswordForm = useForm<UserPasswordFormType>({
    resolver: zodResolver(userPasswordSchema),
    defaultValues: { password: "", newPassword: "", confirmPassword: "" },
    mode: "onSubmit",
  });
  const companyForm = useForm<CompanyFormType>({
    resolver: zodResolver(companySchema),
    defaultValues: { companyName: "", nif: "", address: "", locality: "", postalCode: "", companyPhone: "" },
    mode: "onSubmit",
  });

  useEffect(() => {
    if (user) {
      userInfoForm.reset({
        name: user?.nome || "",
        telefone: user?.telefone || "",
        assinatura: user?.assinatura || "",
      });
    }
    if (empresa) {
      companyForm.reset({
        companyName: empresa?.nome || "",
        nif: empresa?.nif || "",
        address: empresa?.morada || "",
        locality: empresa?.localidade || "",
        postalCode: empresa?.codigoPostal || "",
        companyPhone: empresa?.telefone || "",
        logo: empresa?.logo || "",
      });
    }
  }, [user, empresa, userInfoForm, companyForm]);

  const fetchPaymentMethods = useCallback(async () => {
    if (!user) {
      setPaymentMethods([]);
      return;
    }

    setLoadingPaymentMethod(true);
    try {
      const response = await fetch("/backend/user/payment-methods", {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Não foi possível carregar o cartão");
      }

      const data = await response.json();

      console.log("Dados brutos do método de pagamento:", data);

      setPaymentMethods(normalizePaymentMethods(data));
    } catch (error) {
      console.error("Erro ao obter método de pagamento:", error);
      setPaymentMethods([]);
    } finally {
      setLoadingPaymentMethod(false);
    }
  }, [user]);

  useEffect(() => {
    fetchPaymentMethods();
  }, [fetchPaymentMethods]);

  const handleSetDefaultPaymentMethod = async (paymentMethodId: string) => {
    if (!paymentMethodId || paymentMethodId === "legacy") {
      return;
    }

    setUpdatingDefaultPaymentId(paymentMethodId);
    try {
      const response = await fetch(`/backend/user/payment-method/default/${paymentMethodId}`, {
        method: "PUT",
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(error?.detail || "Não foi possível definir o cartão como padrão.");
      }

      await fetchPaymentMethods();
      setGlobalMessage({ error: false, message: "Cartão definido como padrão." });
    } catch (error: any) {
      setGlobalMessage({
        error: true,
        message: error?.message || "Erro ao definir o cartão como padrão.",
      });
    } finally {
      setUpdatingDefaultPaymentId(null);
    }
  };

  const handleRemovePaymentMethod = async (paymentMethodId: string) => {
    if (!paymentMethodId || paymentMethodId === "legacy") {
      return;
    }

    setRemovingPaymentId(paymentMethodId);
    try {
      const response = await fetch(`/backend/user/payment-method/${paymentMethodId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(error?.detail || "Não foi possível remover o método de pagamento.");
      }

      await fetchPaymentMethods();
      setGlobalMessage({ error: false, message: "Método de pagamento removido." });
    } catch (error: any) {
      setGlobalMessage({
        error: true,
        message: error?.message || "Erro ao remover método de pagamento.",
      });
    } finally {
      setRemovingPaymentId(null);
    }
  };

  // Scroll suave para o topo quando globalMessage muda
  useEffect(() => {
    if (globalMessage) {
      console.log("Global message changed:", globalMessage);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [globalMessage]);

  const handleSubmitUserUpdate: SubmitHandler<UserInfoFormType> = async (data) => {
    setSubmitting((s) => ({ ...s, info: true }));
    try {
      await updateUser({
        nome: data.name,
        telefone: data.telefone,
        assinatura: data.assinatura, // Sempre incluir, mesmo que seja undefined ou vazio
      });
      setGlobalMessage({ error: false, message: "Utilizador atualizado com sucesso" });
    } catch (error: any) {
      setGlobalMessage({ error: true, message: error?.message || "Erro ao atualizar dados do usuário" });
      await new Promise((resolve) => setTimeout(resolve, 0));
    } finally {
      setSubmitting((s) => ({ ...s, info: false }));
    }
  };

  const handleSubmitUserPassword: SubmitHandler<UserPasswordFormType> = async (data) => {
    setSubmitting((s) => ({ ...s, password: true }));
    try {
      await updatePassword(data);
      setGlobalMessage({ error: false, message: "Senha atualizada com sucesso" });
      userPasswordForm.reset();
    } catch (error: any) {
      setGlobalMessage({ error: true, message: error?.message || "Erro ao atualizar senha" });
    } finally {
      setSubmitting((s) => ({ ...s, password: false }));
    }
  };

  const handleSubmitCompany: SubmitHandler<CompanyFormType> = async (data) => {
    setSubmitting((s) => ({ ...s, company: true }));
    try {
      await updateCompany(
        {
          nome: data.companyName,
          nif: data.nif,
          morada: data.address,
          localidade: data.locality,
          codigoPostal: data.postalCode,
          telefone: data.companyPhone,
          logo: data.logo,
        },
        empresa?.id || ""
      );
      setGlobalMessage({ error: false, message: "Empresa atualizada" });
    } finally {
      setSubmitting((s) => ({ ...s, company: false }));
    }
  };

  // Confirmar desativação (REST v1)
  const handleConfirmDeactivate = async () => {
    if (!user?.id) {
      setGlobalMessage({ error: true, message: "Utilizador não encontrado." });
      return;
    }
    setDeactivating(true);
    try {
      // Fazer a requisição ao endpoint PATCH /user/deactivate
      const response = await fetch("backend/user", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // Importante para enviar o cookie _fp
        body: JSON.stringify({
          id: user.id,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Erro ao desativar conta");
      }

      setGlobalMessage({
        error: false,
        message: "Conta desativada. A sessão será terminada.",
      });

      setTimeout(() => {
        logout().finally(() => navigate("/login", { replace: true }));
      }, 800);
    } catch (err: any) {
      setGlobalMessage({
        error: true,
        message: err?.message || "Erro ao apagar utilizador",
      });
    } finally {
      setDeactivating(false);
      setConfirmOpen(false);
      setConfirmText("");
    }
  };

  // Adicionar handlers para apagar assinatura e logo
  const handleDeleteSignature = async () => {
    setSubmitting((s) => ({ ...s, info: true }));
    try {
      await updateUser({ assinatura: "apagar" }); // backend espera "apagar"
      userInfoForm.setValue("assinatura", "", { shouldDirty: true, shouldValidate: false });
      setGlobalMessage({ error: false, message: "Assinatura apagada com sucesso" });
    } catch (err: any) {
      setGlobalMessage({ error: true, message: err?.message || "Erro ao apagar assinatura" });
    } finally {
      setSubmitting((s) => ({ ...s, info: false }));
    }
  };

  const handleDeleteLogo = async () => {
    setSubmitting((s) => ({ ...s, company: true }));
    try {
      await updateCompany({ logo: "apagar" }, empresa?.id || "");
      companyForm.setValue("logo", "", { shouldDirty: true, shouldValidate: false });
      setGlobalMessage({ error: false, message: "Logotipo apagado com sucesso" });
    } catch (err: any) {
      setGlobalMessage({ error: true, message: err?.message || "Erro ao apagar logotipo" });
    } finally {
      setSubmitting((s) => ({ ...s, company: false }));
    }
  };

  const handleOpenPaymentUpdate = async () => {
    setRedirectingToBilling(true);
    try {
      const response = await fetch("/backend/user/payment-method/update-session", {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error?.detail || "Erro ao abrir atualização do cartão");
      }

      const data = await response.json();
      if (!data?.url) {
        throw new Error("URL de atualização indisponível");
      }

      window.location.href = data.url;
    } catch (error: any) {
      setGlobalMessage({
        error: true,
        message: error?.message || "Erro ao abrir atualização do cartão",
      });
      setRedirectingToBilling(false);
      setPaymentDialogOpen(false);
    }
  };

  const hasExpiredPaymentMethods = paymentMethods.some(isPaymentMethodExpired);
  const expiredPaymentMessage = "Existe um cartão expirado. Atualize ou adicione um novo método de pagamento.";
  const defaultPaymentMethod = paymentMethods.find((method) => method.isDefault) || null;

  return (
    <Container maxWidth={false} sx={{ mt: 5 }}>
      <div ref={topRef} />
      {globalMessage && (
        <Box
          sx={{
            mb: 3,
            maxWidth: "700px",
            mx: "auto",
          }}
        >
          <Alert
            severity={globalMessage.error ? "error" : "success"}
            onClose={() => setGlobalMessage(null)}
            variant="filled"
          >
            {globalMessage.message}
          </Alert>
        </Box>
      )}
      <Breadcrumbs
        aria-label="breadcrumb"
        sx={{ mb: 3, backgroundColor: "background.paper", maxWidth: "200px", borderRadius: 5, padding: 0.5 }}
      >
        <StyledBreadcrumb
          component="a"
          sx={{ cursor: "pointer" }}
          onClick={() => navigate("/")}
          icon={<HomeIcon fontSize="small" sx={{ fontSize: "1.8rem" }} />}
        />
        <StyledBreadcrumb sx={{ fontSize: "0.9rem" }} component="span" label="Editar Perfil" />
      </Breadcrumbs>
      <SectionForm title="Alterar Nome e Telefone" onSubmit={userInfoForm.handleSubmit(handleSubmitUserUpdate)}>
        <Grid container spacing={2}>
          {/* Uploader da assinatura */}
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
                {userInfoForm.watch("assinatura") || user?.assinatura ? (
                  <>
                    <img
                      src={`data:image/png;base64,${userInfoForm.watch("assinatura") || user?.assinatura}`}
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
                        bgcolor: "rgba(25, 118, 210, 0.35)", // Normal
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
                      const maxSize = 1024 * 1024; // 1MB
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
                        userInfoForm.setValue("assinatura", (reader.result as string).split(",")[1], {
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

            {/* Botão vermelho para apagar assinatura */}
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                mt: 5,
              }}
            >
              <Button
                variant="outlined"
                color="error"
                onClick={handleDeleteSignature}
                disabled={submitting.info || !(userInfoForm.watch("assinatura") || user?.assinatura)}
              >
                Apagar assinatura
              </Button>
            </Box>
          </Grid>

          <Grid size={{ xs: 12 }}>
            <TextField
              label="Nome"
              fullWidth
              sx={{ width: "100%" }}
              {...userInfoForm.register("name")}
              error={!!userInfoForm.formState.errors.name}
              helperText={userInfoForm.formState.errors.name?.message}
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <GlobalPhone fieldName="telefone" control={userInfoForm.control} errors={userInfoForm.formState.errors} />
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
              <Button
                type="submit"
                variant="contained"
                color="secondary"
                sx={{ width: 200 }}
                disabled={submitting.info}
              >
                Salvar
              </Button>
            </Box>
          </Grid>
        </Grid>
      </SectionForm>
      <SectionForm title="Métodos de Pagamento" onSubmit={(e) => e.preventDefault()}>
        <Grid container spacing={2} sx={{ maxWidth: "450px", mx: "auto" }}>
          {hasExpiredPaymentMethods && (
            <Grid size={{ xs: 12 }}>
              <Alert severity="error" variant="outlined">
                {expiredPaymentMessage}
              </Alert>
            </Grid>
          )}

          <Grid size={{ xs: 9 }} sx={{ mx: "auto" }}>
            {loadingPaymentMethod ? (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  mt: 1,
                }}
              >
                <CircularProgress size={20} />
                <Typography variant="body2">A carregar métodos de pagamento...</Typography>
              </Box>
            ) : defaultPaymentMethod ? (
              <Paper
                elevation={1}
                onClick={() => setPaymentDialogOpen(true)}
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  cursor: "pointer",
                  border: "1px solid",
                  borderColor: isPaymentMethodExpired(defaultPaymentMethod) ? "error.main" : "success.main",
                  bgcolor: "action.selected",
                  transition: "box-shadow 0.2s, transform 0.2s",
                  "&:hover": {
                    boxShadow: 4,
                    transform: "translateY(-1px)",
                  },
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: { xs: "column", sm: "row" },
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 2,
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-start",
                      gap: 0.5,
                      flex: 1,
                      minWidth: 0,
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        minWidth: 0,
                      }}
                    >
                      <Typography
                        variant="body1"
                        sx={{
                          color: "text.primary",
                          fontWeight: 700,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {getPaymentBrandName(defaultPaymentMethod.brand)}{" "}
                        {defaultPaymentMethod.maskedNumber.replace("**** **** **** ", "•••• ")}
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        flexWrap: "wrap",
                      }}
                    >
                      <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>
                        Expires {getPaymentExpiryLabel(defaultPaymentMethod)}
                      </Typography>
                      <Chip
                        size="small"
                        color="success"
                        label="Padrão"
                        sx={{ height: 18, fontWeight: 700, fontSize: "0.65rem" }}
                      />
                    </Box>
                    {isPaymentMethodExpired(defaultPaymentMethod) && (
                      <Typography
                        variant="caption"
                        sx={{
                          color: "error.main",
                          fontWeight: 600,
                          whiteSpace: "nowrap",
                        }}
                      >
                        Cartão expirado
                      </Typography>
                    )}
                  </Box>
                  <Box
                    component="img"
                    src={getPaymentBrandImage(defaultPaymentMethod.brand)}
                    alt={getPaymentBrandName(defaultPaymentMethod.brand)}
                    sx={{
                      height: "auto",
                      width: 45,
                      objectFit: "contain",
                      flexShrink: 0,
                    }}
                  />
                </Box>
              </Paper>
            ) : paymentMethods.length > 0 ? (
              <Paper
                onClick={() => setPaymentDialogOpen(true)}
                elevation={0}
                sx={{
                  p: 2,
                  borderRadius: 2,
                  cursor: "pointer",
                  border: "1px dashed",
                  borderColor: "divider",
                }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    color: "text.secondary",
                  }}
                >
                  Nenhum método padrão definido. Clique para escolher um método padrão.
                </Typography>
              </Paper>
            ) : (
              <Paper
                onClick={() => setPaymentDialogOpen(true)}
                elevation={0}
                sx={{
                  p: 2,
                  borderRadius: 2,
                  cursor: "pointer",
                  border: "1px dashed",
                  borderColor: "divider",
                }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    color: "text.secondary",
                  }}
                >
                  Nenhum cartão guardado. Clique para adicionar um novo método de pagamento.
                </Typography>
              </Paper>
            )}
          </Grid>
        </Grid>
      </SectionForm>
      <SectionForm title="Alterar Senha" onSubmit={userPasswordForm.handleSubmit(handleSubmitUserPassword)}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12 }}>
            <PasswordField
              label="Password"
              fullWidth
              sx={{ width: "100%" }}
              {...userPasswordForm.register("password")}
              error={!!userPasswordForm.formState.errors.password}
              helperText={userPasswordForm.formState.errors.password?.message}
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <PasswordField
              label="Nova Senha"
              fullWidth
              sx={{ width: "100%" }}
              {...userPasswordForm.register("newPassword")}
              error={!!userPasswordForm.formState.errors.newPassword}
              helperText={userPasswordForm.formState.errors.newPassword?.message}
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <PasswordField
              label="Confirmar Nova Senha"
              fullWidth
              sx={{ width: "100%" }}
              {...userPasswordForm.register("confirmPassword")}
              error={!!userPasswordForm.formState.errors.confirmPassword}
              helperText={userPasswordForm.formState.errors.confirmPassword?.message}
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
              <Button
                type="submit"
                variant="contained"
                color="secondary"
                sx={{ width: 200 }}
                disabled={submitting.password}
              >
                Salvar
              </Button>
            </Box>
          </Grid>
        </Grid>
      </SectionForm>
      {empresa?.isAdmin && (
        <SectionForm title="Editar Dados da Empresa" onSubmit={companyForm.handleSubmit(handleSubmitCompany)}>
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
                        bgcolor: "rgba(100, 97, 97, 0.45)", // Mais escuro no hover
                      },
                    },
                  }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {companyForm.watch("logo") || empresa?.logo ? (
                    <>
                      <img
                        src={`data:image/png;base64,${companyForm.watch("logo") || empresa?.logo}`}
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
                          bgcolor: "rgba(25, 118, 210, 0.35)", // Normal
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
                        const maxSize = 1024 * 1024; // Limite de 1MB
                        if (file.size > maxSize) {
                          alert("O ficheiro é demasiado grande. O limite é 1MB.");
                          return;
                        }
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          companyForm.setValue("logo", (reader.result as string).split(",")[1]);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </Paper>
              </Box>

              {/* Botão vermelho para apagar logotipo */}
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  mt: 12,
                }}
              >
                <Button
                  variant="outlined"
                  color="error"
                  onClick={handleDeleteLogo}
                  disabled={submitting.company || !(companyForm.watch("logo") || empresa?.logo)}
                >
                  Apagar logotipo
                </Button>
              </Box>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Nome da Empresa"
                fullWidth
                sx={{ width: "100%" }}
                {...companyForm.register("companyName")}
                error={!!companyForm.formState.errors.companyName}
                helperText={companyForm.formState.errors.companyName?.message}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="NIF"
                fullWidth
                sx={{ width: "100%" }}
                {...companyForm.register("nif")}
                error={!!companyForm.formState.errors.nif}
                helperText={companyForm.formState.errors.nif?.message}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                label="Morada"
                fullWidth
                sx={{ width: "100%" }}
                {...companyForm.register("address")}
                error={!!companyForm.formState.errors.address}
                helperText={companyForm.formState.errors.address?.message}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                label="Localidade"
                fullWidth
                sx={{ width: "100%" }}
                {...companyForm.register("locality")}
                error={!!companyForm.formState.errors.locality}
                helperText={companyForm.formState.errors.locality?.message}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                label="Código Postal"
                fullWidth
                sx={{ width: "100%" }}
                {...companyForm.register("postalCode")}
                error={!!companyForm.formState.errors.postalCode}
                helperText={companyForm.formState.errors.postalCode?.message}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <GlobalPhone
                fieldName="companyPhone"
                control={companyForm.control}
                errors={companyForm.formState.errors}
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
                <Button
                  type="submit"
                  variant="contained"
                  color="secondary"
                  sx={{ width: 200 }}
                  disabled={submitting.company}
                >
                  Salvar
                </Button>
              </Box>
            </Grid>
          </Grid>
        </SectionForm>
      )}
      <Dialog open={paymentDialogOpen} onClose={() => setPaymentDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Gerir métodos de pagamento</DialogTitle>
        <DialogContent sx={{ overflowY: "auto", maxHeight: "70vh" }}>
          <Stack
            spacing={1.5}
            sx={{
              mt: 1,
            }}
          >
            {paymentMethods.length > 0 ? (
              paymentMethods.map((item) => {
                const isExpired = isPaymentMethodExpired(item);
                return (
                  <Paper
                    key={`dialog-${item.id}`}
                    elevation={0}
                    sx={{
                      p: 1.5,
                      borderRadius: 1.5,
                      border: "1px solid",
                      borderColor: isExpired ? "error.main" : item.isDefault ? "success.main" : "divider",
                      bgcolor: item.isDefault ? "action.selected" : "background.default",
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: { xs: "column", md: "row" },
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 2,
                      }}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 3,
                        }}
                      >
                        <Box
                          component="img"
                          src={getPaymentBrandImage(item.brand)}
                          alt={getPaymentBrandName(item.brand)}
                          sx={{ height: 26, width: "auto", maxWidth: 80, objectFit: "contain" }}
                        />
                        <Typography
                          variant="body2"
                          sx={{
                            fontFamily: "monospace",
                            letterSpacing: "0.06em",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {item.maskedNumber || "**** **** **** ----"}
                        </Typography>
                        <Typography variant="body2" color={isExpired ? "error.main" : "text.secondary"}>
                          {getPaymentExpiryLabel(item)}
                        </Typography>
                      </Box>

                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                        }}
                      >
                        {item.isDefault ? (
                          <Button size="small" variant="contained" disabled sx={{ minWidth: 86, mb: 0 }}>
                            Padrão
                          </Button>
                        ) : (
                          <Button
                            size="small"
                            variant="contained"
                            sx={{ mb: 0 }}
                            disabled={
                              redirectingToBilling ||
                              updatingDefaultPaymentId === item.id ||
                              removingPaymentId === item.id ||
                              item.id === "legacy"
                            }
                            onClick={() => handleSetDefaultPaymentMethod(item.id)}
                          >
                            {updatingDefaultPaymentId === item.id ? "A definir..." : "Tornar padrão"}
                          </Button>
                        )}

                        {!item.isDefault && item.id !== "legacy" && (
                          <Tooltip title="Remover cartão">
                            <IconButton
                              onClick={() => handleRemovePaymentMethod(item.id)}
                              disabled={
                                redirectingToBilling ||
                                updatingDefaultPaymentId === item.id ||
                                removingPaymentId === item.id
                              }
                              size="small"
                              sx={{
                                backgroundColor: "error.main",
                                color: "#fff",
                                "&:hover": {
                                  backgroundColor: "error.dark",
                                },
                                width: 40,
                                height: 40,
                              }}
                            >
                              <Delete fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                    </Box>
                    {isExpired && (
                      <Typography
                        variant="caption"
                        sx={{
                          color: "error.main",
                          mt: 0.75,
                          display: "block",
                        }}
                      >
                        Cartão expirado
                      </Typography>
                    )}
                  </Paper>
                );
              })
            ) : (
              <Typography
                variant="body2"
                sx={{
                  color: "text.secondary",
                }}
              >
                Não existem métodos de pagamento guardados.
              </Typography>
            )}

            {hasExpiredPaymentMethods && (
              <Alert severity="error" variant="outlined" sx={{ mt: 1 }}>
                {expiredPaymentMessage}
              </Alert>
            )}

            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                alignContent: "center",
              }}
            >
              <Button sx={{ width: "50%" }} onClick={handleOpenPaymentUpdate} disabled={redirectingToBilling}>
                {redirectingToBilling ? "A abrir Stripe..." : "+ Adicionar método de pagamento"}
              </Button>
            </Box>

            <Typography
              variant="caption"
              sx={{
                color: "text.secondary",
              }}
            >
              O formulário de novo cartão é carregado pela Stripe em ambiente seguro.
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            sx={{ maxWidth: "50%", mx: "auto" }}
            variant="outlined"
            onClick={() => setPaymentDialogOpen(false)}
            disabled={redirectingToBilling}
          >
            Cancelar
          </Button>
        </DialogActions>
      </Dialog>
      {/* Sección de desativação de utilizador (Versão 1 - REST) */}
      <Paper
        elevation={3}
        sx={{
          p: 3,
          borderRadius: 3,
          mt: 2,
          mx: "auto",
          width: "100%",
          maxWidth: "700px",
          border: "1px solid",
          borderColor: "error.light",
          bgcolor: "error.lighter",
        }}
      >
        <Stack
          direction="row"
          spacing={2}
          sx={{
            alignItems: "center",
            mb: 2,
          }}
        >
          <WarningAmberIcon color="error" />
          <Typography
            variant="h2"
            sx={{
              fontWeight: "bold",
              color: "error.main",
            }}
          >
            Apagar utilizador
          </Typography>
        </Stack>

        <Typography variant="body1" sx={{ mb: 2 }}>
          A sua conta será apagada e o sistema terminará a sessão automaticamente. Será retida por 30 dias até ser
          apagada permanentemente.
        </Typography>

        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
          }}
        >
          <Button variant="outlined" color="error" onClick={() => setConfirmOpen(true)} disabled={deactivating}>
            {deactivating ? "Processando..." : "Apagar conta"}
          </Button>
        </Box>

        <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} maxWidth="xs" fullWidth>
          <DialogTitle>Confirmar exclusão</DialogTitle>
          <DialogContent>
            <Typography sx={{ mb: 2 }}>
              Esta ação irá apagar a sua conta. Para confirmar, escreva <b>Apagar</b> no campo abaixo.
            </Typography>
            <TextField
              autoFocus
              fullWidth
              label="Confirmar"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Apagar"
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setConfirmOpen(false)} disabled={deactivating}>
              Cancelar
            </Button>
            <Button
              variant="contained"
              color="error"
              onClick={handleConfirmDeactivate}
              disabled={deactivating || confirmText !== "Apagar"}
            >
              {deactivating ? "Desativando..." : "Confirmar"}
            </Button>
          </DialogActions>
        </Dialog>
      </Paper>
    </Container>
  );
}

export default EditProfilePage;

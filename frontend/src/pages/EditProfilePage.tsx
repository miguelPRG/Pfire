import { useCallback, useEffect, useRef, useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { Alert, Box, Breadcrumbs, Container } from "@mui/material";
import HomeIcon from "@mui/icons-material/Home";
import { useAuth } from "../hooks/AuthContext";
import StyledBreadcrumb from "../components/StyledBreadCrumbs";
import { billingApi } from "../features/billing/api";
import { usersApi } from "../features/users/api";
import CompanyForm from "./editProfile/CompanyForm";
import DeleteAccountSection from "./editProfile/DeleteAccountSection";
import PasswordForm from "./editProfile/PasswordForm";
import PaymentMethodsForm from "./editProfile/PaymentMethodsForm";
import UserInfoForm from "./editProfile/UserInfoForm";
import { companySchema, userInfoSchema, userPasswordSchema } from "./editProfile/schemas";
import type { CompanyFormType, UserInfoFormType, UserPasswordFormType } from "./editProfile/schemas";
import { formatStripeDate, isPaymentMethodExpired, normalizePaymentMethods } from "./editProfile/paymentUtils";
export {
  getPaymentBrandImage,
  getPaymentBrandKey,
  getPaymentBrandName,
  getPaymentExpiryLabel,
  isPaymentMethodExpired,
  normalizePaymentMethods,
} from "./editProfile/paymentUtils";
import type {
  CancelSubscriptionResponseType,
  MessageType,
  PaymentMethodType,
  SubmittingState,
  SubscriptionInfoType,
} from "./editProfile/types";

function EditProfilePage() {
  const { user, empresa, updateUser, updatePassword, updateCompany, logout } = useAuth();
  const navigate = useNavigate();

  const [globalMessage, setGlobalMessage] = useState<MessageType>(null);
  const [submitting, setSubmitting] = useState<SubmittingState>({ info: false, password: false, company: false });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deactivating, setDeactivating] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodType[]>([]);
  const [loadingPaymentMethod, setLoadingPaymentMethod] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [redirectingToBilling, setRedirectingToBilling] = useState(false);
  const [updatingDefaultPaymentId, setUpdatingDefaultPaymentId] = useState<string | null>(null);
  const [removingPaymentId, setRemovingPaymentId] = useState<string | null>(null);
  const [subscriptionInfo, setSubscriptionInfo] = useState<SubscriptionInfoType | null>(null);
  const [loadingSubscriptionInfo, setLoadingSubscriptionInfo] = useState(false);
  const [cancelSubscriptionOpen, setCancelSubscriptionOpen] = useState(false);
  const [cancelingSubscription, setCancelingSubscription] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const assinaturaInputRef = useRef<HTMLInputElement>(null);

  const userInfoForm = useForm<UserInfoFormType>({
    resolver: zodResolver(userInfoSchema),
    defaultValues: { name: "", telefone: "", assinatura: "" },
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
        name: user.nome || "",
        telefone: user.telefone || "",
        assinatura: user.assinatura || "",
      });
    }

    if (empresa) {
      companyForm.reset({
        companyName: empresa.nome || "",
        nif: empresa.nif || "",
        address: empresa.morada || "",
        locality: empresa.localidade || "",
        postalCode: empresa.codigoPostal || "",
        companyPhone: empresa.telefone || "",
        logo: empresa.logo || "",
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
      const data = await billingApi.listPaymentMethods<any>();
      console.log("Dados brutos do método de pagamento:", data);
      setPaymentMethods(normalizePaymentMethods(data));
      const nextBillingDate = data?.next_billing_date ?? null;
      if (nextBillingDate) {
        setSubscriptionInfo((current) => ({
          has_active_subscription: true,
          is_trialing: current?.is_trialing ?? false,
          trial_end: current?.trial_end ?? null,
          current_period_end: current?.current_period_end ?? nextBillingDate,
          next_billing_date: nextBillingDate,
          cancel_at_period_end: current?.cancel_at_period_end ?? false,
          canceled_at: current?.canceled_at ?? null,
          plan_name: current?.plan_name ?? null,
          status: current?.status ?? "active",
        }));
      }
    } catch (error) {
      console.error("Erro ao obter método de pagamento:", error);
      setPaymentMethods([]);
    } finally {
      setLoadingPaymentMethod(false);
    }
  }, [user]);

  const fetchSubscriptionInfo = useCallback(async () => {
    if (!user) {
      setSubscriptionInfo(null);
      return;
    }

    setLoadingSubscriptionInfo(true);
    try {
      const data = await billingApi.getTrialInfo<SubscriptionInfoType>();
      console.log("Dados brutos da subscrição:", data);
      setSubscriptionInfo((current) => ({
        ...data,
        next_billing_date: data.next_billing_date ?? current?.next_billing_date ?? null,
      }));
    } catch (error) {
      console.error("Erro ao obter informação da subscrição:", error);
      setSubscriptionInfo(null);
    } finally {
      setLoadingSubscriptionInfo(false);
    }
  }, [user]);

  useEffect(() => {
    fetchPaymentMethods();
  }, [fetchPaymentMethods]);

  useEffect(() => {
    fetchSubscriptionInfo();
  }, [fetchSubscriptionInfo]);

  useEffect(() => {
    if (globalMessage) {
      console.log("Global message changed:", globalMessage);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [globalMessage]);

  const handleSetDefaultPaymentMethod = async (paymentMethodId: string) => {
    if (!paymentMethodId || paymentMethodId === "legacy") {
      return;
    }

    setUpdatingDefaultPaymentId(paymentMethodId);
    try {
      await billingApi.setDefaultPaymentMethod<any>(paymentMethodId);
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
      await billingApi.removePaymentMethod<any>(paymentMethodId);
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

  const handleSubmitUserUpdate: SubmitHandler<UserInfoFormType> = async (data) => {
    setSubmitting((s) => ({ ...s, info: true }));
    try {
      await updateUser({
        nome: data.name,
        telefone: data.telefone,
        assinatura: data.assinatura,
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

  const handleConfirmDeactivate = async () => {
    if (!user?.id) {
      setGlobalMessage({ error: true, message: "Utilizador não encontrado." });
      return;
    }

    setDeactivating(true);
    try {
      await usersApi.deactivateSelf<any>({
        id: user.id,
      });

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

  const handleDeleteSignature = async () => {
    setSubmitting((s) => ({ ...s, info: true }));
    try {
      await updateUser({ assinatura: "apagar" });
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
      const data = await billingApi.createPaymentMethodUpdateSession<{ url?: string }>();
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

  const handleCancelSubscriptionAtPeriodEnd = async () => {
    setCancelingSubscription(true);
    try {
      const result = await billingApi.cancelSubscriptionAtPeriodEnd<CancelSubscriptionResponseType>();
      await fetchSubscriptionInfo();
      setCancelSubscriptionOpen(false);
      setGlobalMessage({
        error: false,
        message: result.already_scheduled
          ? `O cancelamento já estava agendado para ${formatStripeDate(result.current_period_end)}.`
          : `Subscrição agendada para cancelamento em ${formatStripeDate(result.current_period_end)}.`,
      });
    } catch (error: any) {
      setGlobalMessage({
        error: true,
        message: error?.message || "Erro ao agendar cancelamento da subscrição.",
      });
    } finally {
      setCancelingSubscription(false);
    }
  };

  const canForceExpiredCard = import.meta.env.DEV || __APP_BRANCH__ !== "main";
  const forceExpiredCardValue = new URLSearchParams(window.location.search).get("forceExpiredCard");
  const forceExpiredCard = canForceExpiredCard && ["plain", "true", "1"].includes(forceExpiredCardValue || "");
  const forceExpiredCardPlainText = forceExpiredCardValue === "plain";
  const isPaymentMethodExpiredForUi = (paymentMethod: PaymentMethodType) =>
    forceExpiredCard || isPaymentMethodExpired(paymentMethod);

  return (
    <Container maxWidth={false} sx={{ mt: 5 }}>
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

      <UserInfoForm
        form={userInfoForm}
        user={user}
        assinaturaInputRef={assinaturaInputRef}
        submitting={submitting.info}
        onSubmit={userInfoForm.handleSubmit(handleSubmitUserUpdate)}
        onDeleteSignature={handleDeleteSignature}
      />

      <PaymentMethodsForm
        paymentMethods={paymentMethods}
        loadingPaymentMethod={loadingPaymentMethod}
        paymentDialogOpen={paymentDialogOpen}
        setPaymentDialogOpen={setPaymentDialogOpen}
        redirectingToBilling={redirectingToBilling}
        updatingDefaultPaymentId={updatingDefaultPaymentId}
        removingPaymentId={removingPaymentId}
        subscriptionInfo={subscriptionInfo}
        loadingSubscriptionInfo={loadingSubscriptionInfo}
        cancelSubscriptionOpen={cancelSubscriptionOpen}
        setCancelSubscriptionOpen={setCancelSubscriptionOpen}
        cancelingSubscription={cancelingSubscription}
        forceExpiredCardPlainText={forceExpiredCardPlainText}
        userPlan={user?.plano}
        isPaymentMethodExpiredForUi={isPaymentMethodExpiredForUi}
        onSetDefaultPaymentMethod={handleSetDefaultPaymentMethod}
        onRemovePaymentMethod={handleRemovePaymentMethod}
        onOpenPaymentUpdate={handleOpenPaymentUpdate}
        onCancelSubscriptionAtPeriodEnd={handleCancelSubscriptionAtPeriodEnd}
      />

      <PasswordForm
        form={userPasswordForm}
        submitting={submitting.password}
        onSubmit={userPasswordForm.handleSubmit(handleSubmitUserPassword)}
      />

      <CompanyForm
        form={companyForm}
        empresa={empresa}
        fileInputRef={fileInputRef}
        submitting={submitting.company}
        onSubmit={companyForm.handleSubmit(handleSubmitCompany)}
        onDeleteLogo={handleDeleteLogo}
      />

      <DeleteAccountSection
        confirmOpen={confirmOpen}
        setConfirmOpen={setConfirmOpen}
        confirmText={confirmText}
        setConfirmText={setConfirmText}
        deactivating={deactivating}
        onConfirmDeactivate={handleConfirmDeactivate}
      />
    </Container>
  );
}

export default EditProfilePage;

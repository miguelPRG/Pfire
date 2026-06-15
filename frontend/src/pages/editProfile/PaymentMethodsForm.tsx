import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { Delete } from "@mui/icons-material";
import SectionForm from "./SectionForm";
import {
  formatStripeDate,
  getPaymentBrandImage,
  getPaymentBrandName,
  getPaymentExpiryLabel,
  getSubscriptionBillingTimestamp,
} from "./paymentUtils";
import type { PaymentMethodType, SubscriptionInfoType } from "./types";

type PaymentMethodsFormProps = {
  paymentMethods: PaymentMethodType[];
  loadingPaymentMethod: boolean;
  paymentDialogOpen: boolean;
  setPaymentDialogOpen: (open: boolean) => void;
  redirectingToBilling: boolean;
  updatingDefaultPaymentId: string | null;
  removingPaymentId: string | null;
  subscriptionInfo: SubscriptionInfoType | null;
  loadingSubscriptionInfo: boolean;
  cancelSubscriptionOpen: boolean;
  setCancelSubscriptionOpen: (open: boolean) => void;
  cancelingSubscription: boolean;
  forceExpiredCardPlainText: boolean;
  userPlan?: string;
  isPaymentMethodExpiredForUi: (paymentMethod: PaymentMethodType) => boolean;
  onSetDefaultPaymentMethod: (paymentMethodId: string) => void;
  onRemovePaymentMethod: (paymentMethodId: string) => void;
  onOpenPaymentUpdate: () => void;
  onCancelSubscriptionAtPeriodEnd: () => void;
};

export default function PaymentMethodsForm({
  paymentMethods,
  loadingPaymentMethod,
  paymentDialogOpen,
  setPaymentDialogOpen,
  redirectingToBilling,
  updatingDefaultPaymentId,
  removingPaymentId,
  subscriptionInfo,
  loadingSubscriptionInfo,
  cancelSubscriptionOpen,
  setCancelSubscriptionOpen,
  cancelingSubscription,
  forceExpiredCardPlainText,
  userPlan,
  isPaymentMethodExpiredForUi,
  onSetDefaultPaymentMethod,
  onRemovePaymentMethod,
  onOpenPaymentUpdate,
  onCancelSubscriptionAtPeriodEnd,
}: PaymentMethodsFormProps) {
  const defaultPaymentMethod = paymentMethods.find((method) => method.isDefault) || null;
  const hasExpiredPaymentMethods = paymentMethods.some(isPaymentMethodExpiredForUi);
  const hasExpiredDefaultPaymentMethod = Boolean(
    defaultPaymentMethod && isPaymentMethodExpiredForUi(defaultPaymentMethod)
  );
  const expiredPaymentMessage = "Existe um cartão expirado. Atualize ou adicione um novo método de pagamento.";
  const billingPeriodEnd = getSubscriptionBillingTimestamp(subscriptionInfo);
  const billingDateLabel = subscriptionInfo?.cancel_at_period_end
    ? "Termina em"
    : subscriptionInfo?.is_trialing
      ? "Fim do trial"
      : "Próxima cobrança";
  const subscriptionCanBeCanceled =
    Boolean(subscriptionInfo?.has_active_subscription) && !subscriptionInfo?.cancel_at_period_end;

  const subscriptionDetails = loadingSubscriptionInfo ? (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
      <CircularProgress size={16} />
      <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>
        A carregar informação da subscrição...
      </Typography>
    </Box>
  ) : subscriptionInfo?.has_active_subscription ? (
    <Stack spacing={1} sx={{ width: "100%" }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1.5, flexWrap: "wrap" }}>
        <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700 }}>
          {billingDateLabel}
        </Typography>
        <Typography variant="caption" sx={{ color: "text.primary", fontWeight: 700 }}>
          {formatStripeDate(billingPeriodEnd)}
        </Typography>
      </Box>
      {!billingPeriodEnd && (
        <Typography variant="caption" sx={{ color: "warning.main", fontWeight: 600 }}>
          A Stripe não devolveu a data do período atual.
        </Typography>
      )}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1.5, flexWrap: "wrap" }}>
        <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>
          {subscriptionInfo.plan_name || userPlan || "Subscrição ativa"}
        </Typography>
        <Chip
          size="small"
          color={subscriptionInfo.cancel_at_period_end ? "warning" : "success"}
          label={subscriptionInfo.cancel_at_period_end ? "Cancelamento agendado" : "Plano ativo"}
          sx={{ height: 20, fontWeight: 700, fontSize: "0.65rem" }}
        />
      </Box>
      {subscriptionInfo.cancel_at_period_end ? (
        <Typography variant="caption" sx={{ color: "warning.main", fontWeight: 600 }}>
          O plano continua ativo até {formatStripeDate(billingPeriodEnd)}.
        </Typography>
      ) : (
        <Button
          variant="outlined"
          color="error"
          size="small"
          onClick={(event) => {
            event.stopPropagation();
            setCancelSubscriptionOpen(true);
          }}
          disabled={!subscriptionCanBeCanceled || cancelingSubscription}
          sx={{ alignSelf: "flex-start", mt: 0.5 }}
        >
          Cancelar subscrição
        </Button>
      )}
    </Stack>
  ) : (
    <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700 }}>
      Não tem nenhum plano ativo de momento.
    </Typography>
  );

  return (
    <>
      <SectionForm title="Métodos de Pagamento" onSubmit={(e) => e.preventDefault()}>
        <Grid container spacing={2} sx={{ maxWidth: "450px", mx: "auto" }}>
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
              <>
                <Paper
                  elevation={1}
                  onClick={() => setPaymentDialogOpen(true)}
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    cursor: "pointer",
                    border: "1px solid",
                    borderColor: hasExpiredDefaultPaymentMethod ? "error.main" : "success.main",
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
                          Expira {getPaymentExpiryLabel(defaultPaymentMethod)}
                        </Typography>
                        <Chip
                          size="small"
                          color="success"
                          label="Padrão"
                          sx={{ height: 18, fontWeight: 700, fontSize: "0.65rem" }}
                        />
                      </Box>
                      {hasExpiredDefaultPaymentMethod && (
                        <Typography
                          variant="caption"
                          sx={{
                            color: "error.main",
                            fontWeight: 600,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {forceExpiredCardPlainText ? "Cartão expirado (teste em texto)" : "Cartão expirado"}
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
                  <Box sx={{ mt: 1.5, pt: 1.5, borderTop: "1px solid", borderColor: "divider" }}>
                    {subscriptionDetails}
                  </Box>
                </Paper>
              </>
            ) : paymentMethods.length > 0 ? (
              <>
                <PaymentPlaceholder
                  borderColor="divider"
                  onClick={() => setPaymentDialogOpen(true)}
                  text="Nenhum método padrão definido. Clique para escolher um método padrão."
                >
                  {subscriptionDetails}
                </PaymentPlaceholder>
              </>
            ) : (
              <>
                <PaymentPlaceholder
                  borderColor="divider"
                  onClick={() => setPaymentDialogOpen(true)}
                  text="Nenhum cartão guardado. Clique para adicionar um novo método de pagamento."
                >
                  {subscriptionDetails}
                </PaymentPlaceholder>
              </>
            )}
          </Grid>
        </Grid>
      </SectionForm>

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
                const isExpired = isPaymentMethodExpiredForUi(item);
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
                            onClick={() => onSetDefaultPaymentMethod(item.id)}
                          >
                            {updatingDefaultPaymentId === item.id ? "A definir..." : "Tornar padrão"}
                          </Button>
                        )}

                        {!item.isDefault && item.id !== "legacy" && (
                          <Tooltip title="Remover cartão">
                            <IconButton
                              onClick={() => onRemovePaymentMethod(item.id)}
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
                        {forceExpiredCardPlainText ? "Cartão expirado (teste em texto)" : "Cartão expirado"}
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
              <Button sx={{ width: "50%" }} onClick={onOpenPaymentUpdate} disabled={redirectingToBilling}>
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

      <Dialog open={cancelSubscriptionOpen} onClose={() => setCancelSubscriptionOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Cancelar subscrição</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            O cancelamento será agendado para {formatStripeDate(billingPeriodEnd)}. A conta mantém o plano ativo até
            essa data e não será cobrada novamente depois disso.
          </Typography>
          <Alert severity="warning" variant="outlined">
            Esta ação cancela a subscrição correspondente na Stripe no fim do período de cobrança atual.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelSubscriptionOpen(false)} disabled={cancelingSubscription}>
            Manter subscrição
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={onCancelSubscriptionAtPeriodEnd}
            disabled={cancelingSubscription}
          >
            {cancelingSubscription ? "A agendar..." : "Confirmar cancelamento"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

function PaymentPlaceholder({
  borderColor,
  children,
  onClick,
  text,
}: {
  borderColor: string;
  children: React.ReactNode;
  onClick: () => void;
  text: string;
}) {
  return (
    <Paper
      onClick={onClick}
      elevation={0}
      sx={{
        p: 2,
        borderRadius: 2,
        cursor: "pointer",
        border: "1px dashed",
        borderColor,
      }}
    >
      <Stack spacing={1.5}>
        <Typography
          variant="body2"
          sx={{
            color: "text.secondary",
          }}
        >
          {text}
        </Typography>
        <Box sx={{ pt: 1.5, borderTop: "1px solid", borderColor: "divider" }}>{children}</Box>
      </Stack>
    </Paper>
  );
}

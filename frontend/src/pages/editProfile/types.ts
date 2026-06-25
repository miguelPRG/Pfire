export type MessageType = { error: boolean; message: string } | null;

export type PaymentMethodType = {
  id: string;
  brand: string | null;
  last4: string | null;
  expMonth: number | null;
  expYear: number | null;
  maskedNumber: string;
  isDefault: boolean;
};

export type SubscriptionInfoType = {
  has_active_subscription: boolean;
  is_trialing: boolean;
  trial_end: number | null;
  current_period_end: number | null;
  next_billing_date?: number | null;
  cancel_at_period_end: boolean;
  canceled_at: number | null;
  plan_name: string | null;
  status: string | null;
};

export type CancelSubscriptionResponseType = {
  ok: boolean;
  current_period_end: number | null;
  cancel_at_period_end: boolean;
  already_scheduled?: boolean;
};

export type SubmittingState = {
  info: boolean;
  password: boolean;
  company: boolean;
};

export type ProfileUser = {
  id: string;
  nome: string;
  email: string;
  telefone?: string;
  assinatura?: string;
  plano?: string;
  payment_error?: string | null;
};

export type ProfileCompany = {
  id: string;
  nome: string;
  nif: string;
  telefone: string;
  morada: string;
  localidade: string;
  codigoPostal: string;
  logo: string;
  isAdmin: boolean | null;
};

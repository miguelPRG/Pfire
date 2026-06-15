import { z } from "zod";
import isValidNIF from "../utils/isValidNIF";

export const userInfoSchema = z.object({
  name: z.string().nonempty("Nome é obrigatório").trim(),
  telefone: z
    .string()
    .trim()
    .regex(/^[+]?\d{9,15}$/, "Número de telefone inválido")
    .optional(),
  assinatura: z.string().optional(),
});

export const userPasswordSchema = z
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

export const companySchema = z.object({
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

export type UserInfoFormType = z.infer<typeof userInfoSchema>;
export type UserPasswordFormType = z.infer<typeof userPasswordSchema>;
export type CompanyFormType = z.infer<typeof companySchema>;

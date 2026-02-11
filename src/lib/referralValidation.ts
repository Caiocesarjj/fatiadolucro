import { z } from "zod";

export const referralCodeSchema = z
  .string()
  .min(3, "Código deve ter pelo menos 3 caracteres")
  .max(20, "Código deve ter no máximo 20 caracteres")
  .regex(/^[A-Z0-9_-]+$/, "Código deve conter apenas letras, números, _ ou -")
  .transform((s) => s.trim().toUpperCase());

/**
 * Validates a referral code string. Returns the sanitized code or null if invalid.
 */
export const validateReferralCode = (
  code: string
): { valid: true; code: string } | { valid: false; error: string } => {
  const result = referralCodeSchema.safeParse(code.trim().toUpperCase());
  if (result.success) {
    return { valid: true, code: result.data };
  }
  return { valid: false, error: result.error.errors[0]?.message ?? "Código inválido" };
};

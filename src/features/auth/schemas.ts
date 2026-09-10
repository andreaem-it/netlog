import { z } from "zod";

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254)
  .pipe(z.email("Inserisci un indirizzo email valido."));
export const passwordSchema = z
  .string()
  .min(12, "Usa almeno 12 caratteri.")
  .max(128, "Usa al massimo 128 caratteri.");
export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "Lo username deve avere almeno 3 caratteri.")
  .max(24)
  .regex(
    /^[a-z][a-z0-9_]*$/,
    "Usa lettere, numeri e underscore; inizia con una lettera.",
  )
  .refine(
    (value) =>
      !["admin", "support", "moderator", "system", "settings", "api"].includes(
        value,
      ),
    "Questo username è riservato.",
  );
export const nameSchema = z
  .string()
  .trim()
  .min(1, "Inserisci il tuo nome.")
  .max(60)
  .refine(
    (value) => !/[\u0000-\u001f\u007f]/.test(value),
    "Il nome contiene caratteri non validi.",
  );

export const registerSchema = z.object({
  name: nameSchema,
  username: usernameSchema,
  email: emailSchema,
  password: passwordSchema,
});
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
});
export const forgotPasswordSchema = z.object({ email: emailSchema });
export const resetPasswordSchema = z.object({
  token: z.string().regex(/^[a-f0-9]{64}$/),
  password: passwordSchema,
});
function ageInYears(date: Date) {
  return (Date.now() - date.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
}
export const birthDateSchema = z
  .string()
  .trim()
  .optional()
  .refine(
    (value) => !value || /^\d{4}-\d{2}-\d{2}$/.test(value),
    "Data di nascita non valida.",
  )
  .transform((value) =>
    value ? new Date(`${value}T00:00:00.000Z`) : undefined,
  )
  .refine(
    (value) => !value || value.getTime() < Date.now(),
    "La data di nascita deve essere nel passato.",
  )
  .refine(
    (value) => !value || ageInYears(value) >= 13,
    "Devi avere almeno 13 anni.",
  )
  .refine(
    (value) => !value || ageInYears(value) <= 120,
    "Data di nascita non valida.",
  );

export const editProfileSchema = z.object({
  name: nameSchema,
  bio: z
    .string()
    .trim()
    .max(500, "La bio può contenere al massimo 500 caratteri."),
  city: z.string().trim().max(80),
  birthDate: birthDateSchema,
  visibility: z.enum(["PUBLIC", "PRIVATE"]),
});

export type FormState = {
  status: "idle" | "error" | "success";
  message?: string;
};
export const initialFormState: FormState = { status: "idle" };

import { z } from "zod";

export const emailSchema = z.email("Érvényes e-mail-címet adj meg.");
export const passwordSchema = z.string().min(8, "A jelszó legalább 8 karakter legyen.").max(128, "A jelszó legfeljebb 128 karakter lehet.");
export const registrationSchema = z.object({
  name: z.string().trim().min(1, "Add meg a nevedet.").max(100, "A név legfeljebb 100 karakter lehet."),
  email: emailSchema,
  password: passwordSchema,
});
export const loginSchema = z.object({ email: emailSchema, password: z.string().min(1, "Add meg a jelszavadat.") });

const messages: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: "Hibás e-mail-cím vagy jelszó.",
  USER_ALREADY_EXISTS: "Ezzel az e-mail-címmel már létezik fiók.",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "Ezzel az e-mail-címmel már létezik fiók.",
  PASSWORD_TOO_SHORT: "A jelszó legalább 8 karakter legyen.",
  PASSWORD_TOO_LONG: "A jelszó legfeljebb 128 karakter lehet.",
  INVALID_TOKEN: "A hivatkozás érvénytelen vagy lejárt. Kérj újat.",
  TOKEN_EXPIRED: "A hivatkozás lejárt. Kérj újat.",
  EMAIL_ALREADY_VERIFIED: "Az e-mail-címedet már megerősítetted.",
};
export function authError(error?: { code?: string; status?: number } | null) {
  if (error?.status === 429) return "Túl sok próbálkozás. Próbáld újra egy perc múlva.";
  return messages[error?.code ?? ""] ?? "A művelet nem sikerült. Próbáld újra később.";
}

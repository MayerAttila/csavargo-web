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
  INVALID_EMAIL: "Az e-mail-cím formátuma hibás. Például: nev@pelda.hu.",
  INVALID_NAME: "Adj meg egy 1–100 karakteres nevet.",
  INVALID_PASSWORD: "Hibás jelszó. Ellenőrizd a jelszavadat, vagy kérj újat.",
  INVALID_EMAIL_OR_PASSWORD: "Hibás e-mail-cím vagy jelszó.",
  USER_NOT_FOUND: "Hibás e-mail-cím vagy jelszó.",
  USER_EMAIL_NOT_FOUND: "Hibás e-mail-cím vagy jelszó.",
  USER_ALREADY_EXISTS: "Ezzel az e-mail-címmel már létezik fiók.",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "Ezzel az e-mail-címmel már létezik fiók.",
  PASSWORD_TOO_SHORT: "A jelszó legalább 8 karakter legyen.",
  PASSWORD_TOO_LONG: "A jelszó legfeljebb 128 karakter lehet.",
  INVALID_TOKEN: "A hivatkozás érvénytelen vagy lejárt. Kérj újat.",
  TOKEN_EXPIRED: "A hivatkozás lejárt. Kérj újat.",
  EMAIL_ALREADY_VERIFIED: "Az e-mail-címedet már megerősítetted.",
  EMAIL_NOT_VERIFIED: "A belépéshez előbb erősítsd meg az e-mail-címedet a kapott levélben.",
  SESSION_EXPIRED: "A bejelentkezésed lejárt. Jelentkezz be újra.",
  SESSION_NOT_FRESH: "A művelethez jelentkezz be újra.",
  FAILED_TO_CREATE_USER: "Nem sikerült létrehozni a fiókot a szerveren. Próbáld újra később.",
  FAILED_TO_CREATE_SESSION: "A szerver nem tudta létrehozni a bejelentkezési munkamenetet. Próbálj újra belépni.",
  FAILED_TO_GET_SESSION: "Nem sikerült ellenőrizni a bejelentkezésedet. Jelentkezz be újra.",
  SIGNUP_DISABLED: "Új fiók létrehozása jelenleg nem engedélyezett.",
  INVALID_ORIGIN: "Ez a webcím nincs engedélyezve a bejelentkezéshez. Nyisd meg az alkalmazást a beállított címen.",
  INVALID_CALLBACK_URL: "A visszairányítási cím nem engedélyezett. Nyisd meg újra a belépési oldalt.",
  AUTH_UNAVAILABLE: "A bejelentkezési szolgáltatás jelenleg nem elérhető. Próbáld újra később.",
};
type AuthOperation = "register" | "login" | "forgot" | "reset" | "logout" | "verification" | "session" | "general";
const fallbacks: Record<AuthOperation, string> = {
  register: "A regisztráció nem fejeződött be. Ellenőrizd az adatokat, majd próbáld újra.",
  login: "A bejelentkezés nem sikerült. Ellenőrizd az e-mail-címedet és a jelszavadat.",
  forgot: "Nem sikerült kérni a jelszó-visszaállító levelet. Próbáld újra később.",
  reset: "Nem sikerült megváltoztatni a jelszavadat. Kérj új visszaállító hivatkozást.",
  logout: "A kijelentkezés nem sikerült. Próbáld újra.",
  verification: "Nem sikerült kérni a megerősítő levelet. Próbáld újra később.",
  session: "Nem sikerült ellenőrizni a bejelentkezésedet. Próbálj újra belépni.",
  general: "A művelet nem sikerült. Próbáld újra később.",
};
export function authError(error?: { code?: string; status?: number } | null, operation: AuthOperation = "general") {
  if (error?.status === 429 || error?.code === "TOO_MANY_REQUESTS") return "Túl sok próbálkozás. Próbáld újra egy perc múlva.";
  if (error?.code && messages[error.code]) return messages[error.code];
  if (error?.status === 0) return "Nem sikerült elérni a szervert. Ellenőrizd az internetkapcsolatodat, majd próbáld újra.";
  if (error?.status && error.status >= 500) return operation === "register"
    ? "A regisztrációs szolgáltatás átmenetileg nem érhető el. Próbáld újra később."
    : "A hitelesítési szerver átmenetileg nem érhető el. Próbáld újra később.";
  if (error?.status === 403) return "Nincs engedélyed ehhez a művelethez. Nyisd meg újra az alkalmazást, és jelentkezz be.";
  if (error?.status === 404) return "A kért hitelesítési szolgáltatás nem található. Próbáld újra később.";
  if (error?.status === 400 || error?.status === 422) return operation === "register"
    ? "A regisztrációs adatok nem megfelelőek. Ellenőrizd a nevet, az e-mail-címet és a legalább 8 karakteres jelszót."
    : fallbacks[operation];
  return fallbacks[operation];
}

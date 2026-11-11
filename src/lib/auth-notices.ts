export const authNotices = {
  registered: "Sikeres regisztráció! Üdv a Csavargón!",
  "signed-in": "Sikeres bejelentkezés!",
  "signed-out": "Sikeresen kijelentkeztél.",
} as const;
export type AuthNotice = keyof typeof authNotices;
const noticeKey = "csavargo:auth-notice";

export function queueAuthNotice(notice: AuthNotice) {
  // Only a fixed notification code crosses the reload; no user or session data.
  try { sessionStorage.setItem(noticeKey, notice); } catch { /* Storage is optional. */ }
}

export function consumeAuthNotice(): string | null {
  try {
    const notice = sessionStorage.getItem(noticeKey);
    sessionStorage.removeItem(noticeKey);
    if (!notice || !Object.hasOwn(authNotices, notice)) return null;
    return authNotices[notice as AuthNotice];
  } catch { return null; }
}

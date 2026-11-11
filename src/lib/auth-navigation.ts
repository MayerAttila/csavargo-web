import { queueAuthNotice, type AuthNotice } from "./auth-notices";

export function navigateAfterAuth(path: "/attekintes" | "/belepes", notice?: AuthNotice) {
  if (notice) queueAuthNotice(notice);
  // A full navigation starts a fresh server request with the updated auth cookie.
  window.location.replace(path);
}

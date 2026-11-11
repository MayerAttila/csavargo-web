export function navigateAfterAuth(path: "/attekintes" | "/belepes") {
  // A full navigation starts a fresh server request with the updated auth cookie.
  window.location.replace(path);
}

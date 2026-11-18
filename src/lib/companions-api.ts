import type { paths } from "@/generated/api";

const path = "/api/companions";
export type CompanionLists = paths[typeof path]["get"]["responses"][200]["content"]["application/json"];
type CompanionRequest = paths[typeof path]["post"]["requestBody"]["content"]["application/json"];

const errors: Record<string, string> = {
  COMPANION_EMAIL_NOT_FOUND: "Ehhez az e-mail-címhez nem tartozik fiók.",
  COMPANION_SELF: "Saját magadat nem jelölheted meg útitársként.",
  COMPANION_ALREADY_ACCEPTED: "Már szerepel az útitársaid között.",
  COMPANION_REQUEST_CONFLICT: "A jelölés állapota megváltozott. Nézd meg a beérkezett jelöléseket.",
  COMPANION_RATE_LIMIT: "Túl sok jelölés. Próbáld újra egy perc múlva.",
  COMPANION_NOT_FOUND: "Ez a jelölés vagy kapcsolat már nem érhető el.",
  INVALID_REQUEST: "Ellenőrizd a megadott e-mail-címet.",
};

async function request(endpoint: string, options?: RequestInit) {
  const response = await fetch(endpoint, { credentials: "same-origin", cache: "no-store", ...options });
  if (!response.ok) {
    const error = await response.json().catch(() => null);
    const message = typeof error?.code === "string" && Object.hasOwn(errors, error.code) ? errors[error.code] : undefined;
    throw new Error(message ?? "A művelet nem sikerült. Próbáld újra.");
  }
  return response;
}

export async function getCompanions(signal: AbortSignal): Promise<CompanionLists> {
  return (await request(path, { signal })).json();
}

export async function inviteCompanion(data: CompanionRequest) {
  await request(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(data) });
}

export async function updateCompanion(id: string, action: "accept" | "remove") {
  const url = `${path}/${encodeURIComponent(id)}`;
  await request(action === "accept" ? `${url}/accept` : url, { method: action === "accept" ? "POST" : "DELETE" });
}

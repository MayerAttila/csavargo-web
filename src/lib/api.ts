import type { paths } from "@/generated/api";

export type Me = paths["/api/me"]["get"]["responses"][200]["content"]["application/json"];
export const meKey = ["me"] as const;
export async function getMe(): Promise<Me> {
  const response = await fetch("/api/me", { credentials: "same-origin", cache: "no-store" });
  if (!response.ok) throw new Error(response.status === 401 ? "UNAUTHORIZED" : "API_UNAVAILABLE");
  return response.json();
}

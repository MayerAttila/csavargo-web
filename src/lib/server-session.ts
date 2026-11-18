import "server-only";
import { headers } from "next/headers";
import { cache } from "react";
import { redirect } from "next/navigation";
import type { Me } from "./api";

export async function requestServerApi(path: string) {
  const incoming = await headers();
  return fetch(new URL(path, process.env.API_INTERNAL_URL ?? "http://127.0.0.1:3001"), {
    headers: { cookie: incoming.get("cookie") ?? "" }, cache: "no-store",
  });
}

export const getServerMe = cache(async (): Promise<Me | null> => {
  const response = await requestServerApi("/api/me");
  if (response.status === 401) return null;
  if (!response.ok) throw new Error("API_UNAVAILABLE");
  return response.json();
});

export async function requireServerMe(): Promise<Me> {
  const me = await getServerMe();
  if (!me) redirect("/belepes");
  return me;
}

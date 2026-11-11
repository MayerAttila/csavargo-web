import "server-only";
import { headers } from "next/headers";
import type { Me } from "./api";

export async function getServerMe(): Promise<Me | null> {
  const incoming = await headers();
  const response = await fetch(new URL("/api/me", process.env.API_INTERNAL_URL ?? "http://127.0.0.1:3001"), {
    headers: { cookie: incoming.get("cookie") ?? "" }, cache: "no-store",
  });
  if (response.status === 401) return null;
  if (!response.ok) throw new Error("API_UNAVAILABLE");
  return response.json();
}

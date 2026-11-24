import { AuthForm } from "@/components/auth/auth-form";
import { getServerMe } from "@/lib/server-session";
import { redirect } from "next/navigation";

export default async function Login({ searchParams }: { searchParams: Promise<{ folytatas?: string }> }) {
  const { folytatas } = await searchParams;
  const destination = folytatas === "utitarsak" ? "/utitarsak" : folytatas === "utazasok" ? "/utazasok" : undefined;
  if (destination) {
    if (await getServerMe().catch(() => null)) redirect(destination);
    return <AuthForm mode="login" destination={destination} />;
  }
  return <AuthForm mode="login" />;
}

import { AuthForm } from "@/components/auth/auth-form";
import { getServerMe } from "@/lib/server-session";
import { redirect } from "next/navigation";

export default async function Login({ searchParams }: { searchParams: Promise<{ folytatas?: string }> }) {
  const { folytatas } = await searchParams;
  if (folytatas === "utitarsak") {
    if (await getServerMe().catch(() => null)) redirect("/utitarsak");
    return <AuthForm mode="login" destination="/utitarsak" />;
  }
  return <AuthForm mode="login" />;
}

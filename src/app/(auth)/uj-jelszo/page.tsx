import { AuthForm } from "@/components/auth/auth-form";
export default async function ResetPassword({ searchParams }: { searchParams: Promise<{ token?: string; error?: string }> }) {
  const { token, error } = await searchParams;
  return <AuthForm mode="reset" token={token} invalidLink={!!error} />;
}

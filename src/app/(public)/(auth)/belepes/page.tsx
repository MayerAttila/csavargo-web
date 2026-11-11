import { AuthForm } from "@/components/auth/auth-form";

export default async function Login({ searchParams }: { searchParams: Promise<{ jelszo?: string }> }) {
  const { jelszo } = await searchParams;
  return <div className="w-full max-w-md">{jelszo === "frissitve" && <p role="status" className="mb-4 text-center text-accent">A jelszavad megváltozott. Jelentkezz be az új jelszóval.</p>}<AuthForm mode="login" /></div>;
}

import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = { title: "Iniciar sesión · Stock Insights" };

export default function LoginPage() {
  return (
    <>
      <h1 className="mb-6 text-xl font-semibold tracking-tight text-balance">Iniciar sesión</h1>
      <LoginForm />
    </>
  );
}

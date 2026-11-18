import type { Metadata } from "next";
import { SignupForm } from "@/components/auth/SignupForm";

export const metadata: Metadata = { title: "Crear cuenta · Stock Insights" };

export default function SignupPage() {
  return (
    <>
      <h1 className="mb-6 text-xl font-semibold tracking-tight text-balance">Crear cuenta</h1>
      <SignupForm />
    </>
  );
}

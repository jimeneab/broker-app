"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login } from "@/lib/auth/actions";
import { AuthField, FormAlert, SubmitButton } from "./AuthField";

export function LoginForm() {
  const [state, formAction, pending] = useActionState(login, {});
  return (
    <form action={formAction} noValidate className="flex flex-col gap-5">
      <FormAlert>{state.formError}</FormAlert>
      <AuthField
        name="email"
        label="Email"
        type="email"
        autoComplete="email"
        defaultValue={state.values?.email}
        error={state.fieldErrors?.email}
      />
      <AuthField
        name="password"
        label="Contraseña"
        type="password"
        autoComplete="current-password"
        error={state.fieldErrors?.password}
      />
      <SubmitButton pending={pending} idle="Entrar" busy="Entrando…" />
      <p className="text-center text-sm text-muted">
        ¿No tienes cuenta?{" "}
        <Link href="/signup" className="font-medium text-foreground underline">
          Crear cuenta
        </Link>
      </p>
    </form>
  );
}

"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signup } from "@/lib/auth/actions";
import { AuthField, FormAlert, SubmitButton } from "./AuthField";

export function SignupForm() {
  const [state, formAction, pending] = useActionState(signup, {});
  return (
    <form action={formAction} noValidate className="flex flex-col gap-5">
      <FormAlert>{state.formError}</FormAlert>
      <AuthField
        name="displayName"
        label="Nombre"
        autoComplete="name"
        defaultValue={state.values?.displayName}
        error={state.fieldErrors?.displayName}
      />
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
        autoComplete="new-password"
        error={state.fieldErrors?.password}
      />
      <SubmitButton pending={pending} idle="Crear cuenta" busy="Creando…" />
      <p className="text-center text-sm text-muted">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="font-medium text-foreground underline">
          Iniciar sesión
        </Link>
      </p>
    </form>
  );
}

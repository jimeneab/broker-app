"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "../supabase/server";
import { loginSchema, signupSchema } from "./schemas";

type Field = "displayName" | "email" | "password";

export type AuthFormState = {
  /** First error per field. */
  fieldErrors?: Partial<Record<Field, string>>;
  formError?: string;
  /** Echoed back so the form is not emptied (never the password). */
  values?: { displayName?: string; email?: string };
};

const text = (formData: FormData, name: string) => {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
};

function firstErrors(error: z.ZodError): AuthFormState["fieldErrors"] {
  const fieldErrors: Partial<Record<Field, string>> = {};
  for (const [field, messages] of Object.entries(z.flattenError(error).fieldErrors)) {
    if (Array.isArray(messages) && messages[0]) fieldErrors[field as Field] = messages[0];
  }
  return fieldErrors;
}

export async function login(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const values = { email: text(formData, "email") };
  const parsed = loginSchema.safeParse({ ...values, password: text(formData, "password") });
  if (!parsed.success) return { fieldErrors: firstErrors(parsed.error), values };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    const formError =
      error.code === "invalid_credentials" ? "Email o contraseña incorrectos." : "No se pudo iniciar sesión. Intenta de nuevo.";
    return { formError, values };
  }
  redirect("/");
}

export async function signup(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const values = { displayName: text(formData, "displayName"), email: text(formData, "email") };
  const parsed = signupSchema.safeParse({ ...values, password: text(formData, "password") });
  if (!parsed.success) return { fieldErrors: firstErrors(parsed.error), values };

  const { displayName, email, password } = parsed.data;
  const supabase = await createSupabaseServerClient();
  // The DB trigger copies display_name into profiles.
  const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { display_name: displayName } } });
  if (error) {
    const formError =
      error.code === "user_already_exists" || error.code === "email_exists"
        ? "Ya existe una cuenta con ese email."
        : error.code === "weak_password"
          ? "La contraseña es demasiado débil."
          : "No se pudo crear la cuenta. Intenta de nuevo.";
    return { formError, values };
  }
  // No session means "Confirm email" is still on in Supabase.
  if (!data.session) return { formError: "Tu cuenta requiere confirmar el email. Revisa tu bandeja.", values };
  redirect("/onboarding");
}

export async function logout(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut({ scope: "local" });
  redirect("/login");
}
